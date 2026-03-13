import { pairs } from '@mirapri/shared/d1-schema';
import { bulkInsertD1, getChanges, isValidSlotId } from '@mirapri/shared/utils';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import type { Env, PairsRequest, PairsResponse } from '../types.js';

export const pairsRoute = new Hono<{ Bindings: Env }>();

/**
 * POST /api/pairs?version=xxx
 * ペアデータを一括 INSERT（バージョン付き、双方向対応）
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
    if (typeof pair.baseSlotId !== 'number' || !isValidSlotId(pair.baseSlotId)) {
      return c.json({ error: 'baseSlotId must be between 1 and 5' }, 400);
    }
    if (typeof pair.partnerSlotId !== 'number' || !isValidSlotId(pair.partnerSlotId)) {
      return c.json({ error: 'partnerSlotId must be between 1 and 5' }, 400);
    }
    if (!pair.baseItemId || typeof pair.baseItemId !== 'string') {
      return c.json({ error: 'Each pair must have a string baseItemId' }, 400);
    }
    if (!pair.partnerItemId || typeof pair.partnerItemId !== 'string') {
      return c.json({ error: 'Each pair must have a string partnerItemId' }, 400);
    }
    if (typeof pair.pairCount !== 'number' || pair.pairCount < 0) {
      return c.json({ error: 'Each pair must have a non-negative pairCount' }, 400);
    }
    if (typeof pair.rank !== 'number' || pair.rank < 1) {
      return c.json({ error: 'Each pair must have a positive rank' }, 400);
    }
  }

  const db = drizzle(c.env.DB);

  const values = body.pairs.map((pair) => ({
    version,
    baseSlotId: pair.baseSlotId,
    partnerSlotId: pair.partnerSlotId,
    baseItemId: pair.baseItemId,
    partnerItemId: pair.partnerItemId,
    pairCount: pair.pairCount,
    rank: pair.rank,
  }));

  const results = await bulkInsertD1({
    items: values,
    onBatch: (batch) => db.insert(pairs).values(batch),
  });

  const totalInserted = results.reduce((sum: number, result) => sum + getChanges(result, 0), 0);

  const response: PairsResponse = {
    success: true,
    inserted: totalInserted,
  };

  return c.json(response);
});
