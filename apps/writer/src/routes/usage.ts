import { usage } from '@mirapri/shared/d1-schema';
import { bulkInsertD1, getChanges, isValidSlotId } from '@mirapri/shared/utils';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import type { Env, UsageRequest, UsageResponse } from '../types.js';

export const usageRoute = new Hono<{ Bindings: Env }>();

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
    if (typeof item.slotId !== 'number' || !isValidSlotId(item.slotId)) {
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

  const results = await bulkInsertD1({
    items: values,
    onBatch: (batch) => db.insert(usage).values(batch),
  });

  const totalInserted = results.reduce((sum: number, result) => sum + getChanges(result, 0), 0);

  const response: UsageResponse = {
    success: true,
    inserted: totalInserted,
  };

  return c.json(response);
});
