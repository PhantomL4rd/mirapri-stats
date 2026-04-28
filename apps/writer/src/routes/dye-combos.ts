import { itemDyeCombos } from '@mirapri/shared/d1-schema';
import { bulkInsertD1, getChanges, isValidSlotId } from '@mirapri/shared/utils';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import type { DyeCombosRequest, DyeCombosResponse, Env } from '../types.js';

export const dyeCombosRoute = new Hono<{ Bindings: Env }>();

/**
 * POST /api/dye-combos?version=xxx
 * 装備ごとの染色組み合わせを一括 INSERT
 */
dyeCombosRoute.post('/', async (c) => {
  const version = c.req.query('version');

  if (!version) {
    return c.json({ error: 'version query parameter is required' }, 400);
  }

  const body = await c.req.json<DyeCombosRequest>();

  if (!body.combos || !Array.isArray(body.combos)) {
    return c.json({ error: 'combos array is required' }, 400);
  }

  for (const combo of body.combos) {
    if (typeof combo.slotId !== 'number' || !isValidSlotId(combo.slotId)) {
      return c.json({ error: 'slotId must be between 1 and 5' }, 400);
    }
    if (!combo.itemId || typeof combo.itemId !== 'string') {
      return c.json({ error: 'Each combo must have a string itemId' }, 400);
    }
    if (combo.stain1Name !== null && typeof combo.stain1Name !== 'string') {
      return c.json({ error: 'stain1Name must be a string or null' }, 400);
    }
    if (combo.stain2Name !== null && typeof combo.stain2Name !== 'string') {
      return c.json({ error: 'stain2Name must be a string or null' }, 400);
    }
    // k-anonymity hard requirement: 3人未満の組み合わせは絶対に保存しない
    if (typeof combo.comboCount !== 'number' || combo.comboCount < 3) {
      return c.json({ error: 'comboCount must be >= 3 (k-anonymity)' }, 400);
    }
    if (typeof combo.rank !== 'number' || combo.rank < 1) {
      return c.json({ error: 'rank must be positive' }, 400);
    }
  }

  const db = drizzle(c.env.DB);

  const values = body.combos.map((combo) => ({
    version,
    slotId: combo.slotId,
    itemId: combo.itemId,
    stain1Name: combo.stain1Name,
    stain2Name: combo.stain2Name,
    comboCount: combo.comboCount,
    rank: combo.rank,
  }));

  const results = await bulkInsertD1({
    items: values,
    onBatch: (batch) => db.insert(itemDyeCombos).values(batch),
  });

  const totalInserted = results.reduce((sum: number, result) => sum + getChanges(result, 0), 0);

  const response: DyeCombosResponse = {
    success: true,
    inserted: totalInserted,
  };

  return c.json(response);
});
