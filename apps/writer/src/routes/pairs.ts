import { SLOT_PAIRS, type SlotPair } from '@mirapuri/shared';
import { pairs } from '@mirapuri/shared/d1-schema';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import type { Env, PairsRequest, PairsResponse } from '../types.js';

export const pairsRoute = new Hono<{ Bindings: Env }>();

// SQLite bind variable limit is 999, pairs has 6 columns
const BATCH_SIZE = 150;

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function getChanges(result: unknown, fallback: number): number {
  // Drizzle ORM D1 の結果形式に対応
  const r = result as { meta?: { changes?: number }; rowsAffected?: number };
  return r.meta?.changes ?? r.rowsAffected ?? fallback;
}

/**
 * POST /api/pairs?version=xxx
 * ペアデータを一括 INSERT（バージョン付き）
 */
pairsRoute.post('/', async (c) => {
  const version = c.req.query('version');

  if (!version) {
    return c.json({ error: 'version query parameter is required' }, 400);
  }

  const body = await c.req.json<PairsRequest>();

  if (!body.pairs || !Array.isArray(body.pairs)) {
    return c.json({ error: 'pairs array is required' }, 400);
  }

  for (const pair of body.pairs) {
    if (!pair.slotPair || !SLOT_PAIRS.includes(pair.slotPair as SlotPair)) {
      return c.json({ error: `Invalid slotPair. Must be one of: ${SLOT_PAIRS.join(', ')}` }, 400);
    }
    if (!pair.itemIdA || typeof pair.itemIdA !== 'string') {
      return c.json({ error: 'Each pair must have a string itemIdA' }, 400);
    }
    if (!pair.itemIdB || typeof pair.itemIdB !== 'string') {
      return c.json({ error: 'Each pair must have a string itemIdB' }, 400);
    }
    if (typeof pair.pairCount !== 'number' || pair.pairCount < 0) {
      return c.json({ error: 'Each pair must have a non-negative pairCount' }, 400);
    }
    if (typeof pair.rank !== 'number' || pair.rank < 1 || pair.rank > 10) {
      return c.json({ error: 'Each pair must have a rank between 1 and 10' }, 400);
    }
  }

  const db = drizzle(c.env.DB);

  const values = body.pairs.map((pair) => ({
    version,
    slotPair: pair.slotPair,
    itemIdA: pair.itemIdA,
    itemIdB: pair.itemIdB,
    pairCount: pair.pairCount,
    rank: pair.rank,
  }));

  // SQLite制限回避のためバッチ分割してINSERT
  const batches = chunk(values, BATCH_SIZE);
  let totalInserted = 0;

  for (const batch of batches) {
    const result = await db.insert(pairs).values(batch);
    totalInserted += getChanges(result, batch.length);
  }

  const response: PairsResponse = {
    success: true,
    inserted: totalInserted,
  };

  return c.json(response);
});
