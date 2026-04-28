import { stains } from '@mirapri/shared/d1-schema';
import { bulkInsertD1, getChanges } from '@mirapri/shared/utils';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import type { Env, StainsRequest, StainsResponse } from '../types.js';

export const stainsRoute = new Hono<{ Bindings: Env }>();

/**
 * POST /api/stains
 * カララントマスタを一括 UPSERT（PK = JP色名、version 管理対象外）
 */
stainsRoute.post('/', async (c) => {
  const body = await c.req.json<StainsRequest>();

  if (!body.stains || !Array.isArray(body.stains)) {
    return c.json({ error: 'stains array is required' }, 400);
  }

  for (const s of body.stains) {
    if (!s.name || typeof s.name !== 'string') {
      return c.json({ error: 'Each stain must have a string name' }, 400);
    }
    if (
      typeof s.r !== 'number' ||
      typeof s.g !== 'number' ||
      typeof s.b !== 'number' ||
      s.r < 0 ||
      s.r > 255 ||
      s.g < 0 ||
      s.g > 255 ||
      s.b < 0 ||
      s.b > 255
    ) {
      return c.json({ error: 'Each stain must have rgb values in 0-255' }, 400);
    }
  }

  const db = drizzle(c.env.DB);

  const values = body.stains.map((s) => ({
    name: s.name,
    dyeId: s.dyeId ?? null,
    category: s.category ?? null,
    r: s.r,
    g: s.g,
    b: s.b,
  }));

  const results = await bulkInsertD1({
    items: values,
    onBatch: (batch) =>
      db
        .insert(stains)
        .values(batch)
        .onConflictDoUpdate({
          target: stains.name,
          set: {
            dyeId: sql`excluded.dye_id`,
            category: sql`excluded.category`,
            r: sql`excluded.r`,
            g: sql`excluded.g`,
            b: sql`excluded.b`,
          },
        }),
  });

  const totalInserted = results.reduce((sum: number, result) => sum + getChanges(result, 0), 0);

  const response: StainsResponse = {
    success: true,
    inserted: totalInserted,
  };

  return c.json(response);
});
