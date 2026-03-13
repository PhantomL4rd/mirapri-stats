import { items } from '@mirapri/shared/d1-schema';
import { bulkInsertD1, getChanges, isValidSlotId } from '@mirapri/shared/utils';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import type { Env, ItemsRequest, ItemsResponse } from '../types.js';

export const itemsRoute = new Hono<{ Bindings: Env }>();

/**
 * POST /api/items
 * アイテムマスタを一括挿入
 * icon_url が新しい値を持つ場合のみ更新（ON CONFLICT DO UPDATE）
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
    if (typeof item.slotId !== 'number' || !isValidSlotId(item.slotId)) {
      return c.json({ error: 'Each item must have a slotId between 1 and 5' }, 400);
    }
  }

  const db = drizzle(c.env.DB);

  const values = body.items.map((item) => ({
    id: item.id,
    name: item.name,
    slotId: item.slotId,
    iconUrl: item.iconUrl ?? null,
  }));

  const results = await bulkInsertD1({
    items: values,
    onBatch: (batch) =>
      db
        .insert(items)
        .values(batch)
        .onConflictDoUpdate({
          target: items.id,
          set: {
            iconUrl: sql`COALESCE(excluded.icon_url, ${items.iconUrl})`,
          },
        }),
  });

  const totalInserted = results.reduce((sum: number, result) => sum + getChanges(result, 0), 0);

  const response: ItemsResponse = {
    success: true,
    inserted: totalInserted,
    skipped: values.length - totalInserted,
  };

  return c.json(response);
});
