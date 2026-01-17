import { items } from '@mirapuri/shared/d1-schema';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import type { Env, ItemsRequest, ItemsResponse } from '../types.js';

export const itemsRoute = new Hono<{ Bindings: Env }>();

// SQLite bind variable limit is 999, items has 3 columns
const BATCH_SIZE = 300;

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
 * POST /api/items
 * アイテムマスタを一括挿入（ON CONFLICT DO NOTHING）
 */
itemsRoute.post('/', async (c) => {
  const body = await c.req.json<ItemsRequest>();

  if (!body.items || !Array.isArray(body.items)) {
    return c.json({ error: 'items array is required' }, 400);
  }

  for (const item of body.items) {
    if (!item.id || typeof item.id !== 'string') {
      return c.json({ error: 'Each item must have a string id' }, 400);
    }
    if (!item.name || typeof item.name !== 'string') {
      return c.json({ error: 'Each item must have a string name' }, 400);
    }
    if (typeof item.slotId !== 'number' || item.slotId < 1 || item.slotId > 5) {
      return c.json({ error: 'Each item must have a slotId between 1 and 5' }, 400);
    }
  }

  const db = drizzle(c.env.DB);

  const values = body.items.map((item) => ({
    id: item.id,
    name: item.name,
    slotId: item.slotId,
  }));

  // SQLite制限回避のためバッチ分割してINSERT
  const batches = chunk(values, BATCH_SIZE);
  let totalInserted = 0;

  for (const batch of batches) {
    const result = await db.insert(items).values(batch).onConflictDoNothing();
    totalInserted += getChanges(result);
  }

  const response: ItemsResponse = {
    success: true,
    inserted: totalInserted,
    skipped: values.length - totalInserted,
  };

  return c.json(response);
});
