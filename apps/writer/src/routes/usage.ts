import { usage } from '@mirapuri/shared/d1-schema';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import type { Env, UsageRequest, UsageResponse } from '../types.js';

export const usageRoute = new Hono<{ Bindings: Env }>();

// SQLite bind variable limit is 999, usage has 4 columns
const BATCH_SIZE = 200;

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function getChanges(result: D1Result): number {
  return result.meta.changes;
}

/**
 * POST /api/usage?version=xxx
 * 使用回数データを一括 INSERT（バージョン付き）
 */
usageRoute.post('/', async (c) => {
  const version = c.req.query('version');

  if (!version) {
    return c.json({ error: 'version query parameter is required' }, 400);
  }

  const body = await c.req.json<UsageRequest>();

  if (!body.usage || !Array.isArray(body.usage)) {
    return c.json({ error: 'usage array is required' }, 400);
  }

  for (const item of body.usage) {
    if (typeof item.slotId !== 'number' || item.slotId < 1 || item.slotId > 5) {
      return c.json({ error: 'Each usage must have a slotId between 1 and 5' }, 400);
    }
    if (!item.itemId || typeof item.itemId !== 'string') {
      return c.json({ error: 'Each usage must have a string itemId' }, 400);
    }
    if (typeof item.usageCount !== 'number' || item.usageCount < 0) {
      return c.json({ error: 'Each usage must have a non-negative usageCount' }, 400);
    }
  }

  const db = drizzle(c.env.DB);

  const values = body.usage.map((item) => ({
    version,
    slotId: item.slotId,
    itemId: item.itemId,
    usageCount: item.usageCount,
  }));

  // SQLite制限回避のためバッチ分割してINSERT
  const batches = chunk(values, BATCH_SIZE);
  let totalInserted = 0;

  for (const batch of batches) {
    const result = await db.insert(usage).values(batch);
    totalInserted += getChanges(result);
  }

  const response: UsageResponse = {
    success: true,
    inserted: totalInserted,
  };

  return c.json(response);
});
