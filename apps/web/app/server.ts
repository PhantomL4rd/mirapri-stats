import type { D1Database } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { renderer } from '../src/renderer';
import {
  type DataFreshness,
  type PartnerItem,
  getDataFreshness,
  getItemInfo,
  getPartnerItems,
  getSimilarItems,
  getTrendingUp,
  getVersatilityRanking,
  searchItems,
} from '../src/lib/queries';
import {
  SLOT_IDS,
  SLOT_NAMES,
  parseSlotParam,
  resolveVersionContext,
} from '../src/lib/db';

type Bindings = { DB: D1Database };

// origin はリクエストごとに取る（カスタムドメイン本番 / workers.dev 並行確認 / wrangler dev で
// 自動的に正しい値になる）。OGP・robots.txt・sitemap.xml で使用。
const getSiteOrigin = (reqUrl: string) => new URL(reqUrl).origin;

const app = new Hono<{ Bindings: Bindings }>();

// Inertia redirect 規約: SPA リクエストに対する外部 redirect は 409 + X-Inertia-Location
// （3xx は fetch が透過的に追従してしまい、Inertia が visit に解釈できないため）
app.use('*', async (c, next) => {
  await next();
  if (
    c.req.header('X-Inertia') &&
    ['PUT', 'PATCH', 'DELETE'].includes(c.req.method) &&
    c.res.status >= 301 &&
    c.res.status <= 302
  ) {
    const location = c.res.headers.get('Location');
    if (location) {
      c.res = new Response(null, {
        status: 303,
        headers: { Location: location },
      });
    }
  }
});

app.use('*', renderer());

const empty = <T>(): T[] => [];

const routes = app
  .get('/', async (c) => {
    const url = new URL(c.req.url);
    const currentSlot = parseSlotParam(url.searchParams.get('slot'));
    const versionParam = url.searchParams.get('version');
    const slotId = SLOT_IDS[currentSlot] ?? 2;

    const db = c.env.DB;
    let trendItems: Awaited<ReturnType<typeof getTrendingUp>> = [];
    let freshness: DataFreshness = { dataFrom: null, dataTo: null };
    let ctx = {
      versions: empty<Awaited<ReturnType<typeof resolveVersionContext>>['versions'][number]>(),
      currentVersion: '',
      isActiveVersion: true,
      linkVersion: undefined as string | undefined,
      shouldRedirect: false,
    };

    try {
      ctx = await resolveVersionContext(db, versionParam);
      if (ctx.shouldRedirect) {
        const redirect = new URL(url);
        redirect.searchParams.delete('version');
        return c.redirect(redirect.pathname + redirect.search);
      }
      [trendItems, freshness] = await Promise.all([
        getTrendingUp(db, slotId, 10, ctx.currentVersion),
        getDataFreshness(db, ctx.currentVersion),
      ]);
    } catch (e) {
      console.error('D1 query error:', e);
    }

    return c.render('Home', {
      trendItems,
      freshness,
      currentSlot,
      versions: ctx.versions,
      currentVersion: ctx.currentVersion,
      linkVersion: ctx.linkVersion,
    });
  })
  .get('/ranking', async (c) => {
    const url = new URL(c.req.url);
    const currentSlot = parseSlotParam(url.searchParams.get('slot'));
    const versionParam = url.searchParams.get('version');
    const slotId = SLOT_IDS[currentSlot] ?? 2;

    const db = c.env.DB;
    let items: Awaited<ReturnType<typeof getVersatilityRanking>> = [];
    let freshness: DataFreshness = { dataFrom: null, dataTo: null };
    let ctx = {
      versions: empty<Awaited<ReturnType<typeof resolveVersionContext>>['versions'][number]>(),
      currentVersion: '',
      isActiveVersion: true,
      linkVersion: undefined as string | undefined,
      shouldRedirect: false,
    };

    try {
      ctx = await resolveVersionContext(db, versionParam);
      if (ctx.shouldRedirect) {
        const redirect = new URL(url);
        redirect.searchParams.delete('version');
        return c.redirect(redirect.pathname + redirect.search);
      }
      [items, freshness] = await Promise.all([
        getVersatilityRanking(db, slotId, 10, ctx.currentVersion),
        getDataFreshness(db, ctx.currentVersion),
      ]);
    } catch (e) {
      console.error('D1 query error:', e);
    }

    return c.render('Ranking', {
      items,
      freshness,
      currentSlot,
      versions: ctx.versions,
      currentVersion: ctx.currentVersion,
      linkVersion: ctx.linkVersion,
    });
  })
  .get('/item/:itemId', async (c) => {
    const itemId = c.req.param('itemId');
    if (!itemId) {
      return c.redirect('/');
    }

    const url = new URL(c.req.url);
    const versionParam = url.searchParams.get('version');
    const db = c.env.DB;

    const [ctx, itemInfo] = await Promise.all([
      resolveVersionContext(db, versionParam),
      getItemInfo(db, itemId),
    ]);

    if (ctx.shouldRedirect) {
      const redirect = new URL(url);
      redirect.searchParams.delete('version');
      return c.redirect(redirect.pathname + redirect.search);
    }

    if (!itemInfo) {
      return c.redirect('/');
    }

    const [partnerItems, freshness, similarItems] = await Promise.all([
      getPartnerItems(db, itemId, 30, ctx.currentVersion),
      getDataFreshness(db, ctx.currentVersion),
      getSimilarItems(db, itemId, itemInfo.slotId, 3, ctx.currentVersion),
    ]);

    const slotName = SLOT_NAMES[itemInfo.slotId] ?? '装備';

    // 部位ごとにグループ化（表示順は SLOT_ORDER に従う）
    const partnersBySlot = partnerItems.reduce(
      (acc, item) => {
        if (!acc[item.slotId]) acc[item.slotId] = [];
        acc[item.slotId].push(item);
        return acc;
      },
      {} as Record<number, PartnerItem[]>,
    );

    const isMultiSlotPartners = itemInfo.slotId === 2 || itemInfo.slotId === 4;
    const slotOrder = [1, 2, 3, 4, 5].filter((s) => s !== itemInfo.slotId);

    const partnerGroups = isMultiSlotPartners
      ? slotOrder
          .filter((sId) => (partnersBySlot[sId]?.length ?? 0) > 0)
          .map((sId) => ({
            slotId: sId,
            slotLabel: SLOT_NAMES[sId] ?? '装備',
            items: partnersBySlot[sId] ?? [],
          }))
      : partnerItems.length > 0
        ? [{ slotId: itemInfo.slotId, slotLabel: slotName, items: partnerItems }]
        : [];

    return c.render('Item/Show', {
      itemInfo,
      slotName,
      partnerGroups,
      similarItems,
      freshness,
      versions: ctx.versions,
      currentVersion: ctx.currentVersion,
      linkVersion: ctx.linkVersion,
      isMultiSlotPartners,
    });
  })
  .get('/faq', (c) => c.render('Faq', {}))
  .get('/readme', (c) => c.render('Readme', {}))
  .get('/api/search', async (c) => {
    const query = c.req.query('q') ?? '';
    const version = c.req.query('version') ?? undefined;

    if (query.length < 1) return c.json([]);

    try {
      const results = await searchItems(c.env.DB, query, 10, version);
      return c.json(results);
    } catch (e) {
      console.error('Search error:', e);
      return c.json([]);
    }
  })
  .get('/api/similar', async (c) => {
    const itemId = c.req.query('itemId');
    const limitParam = c.req.query('limit');
    const version = c.req.query('version') ?? undefined;

    if (!itemId) {
      return c.json(
        { error: 'itemId is required', items: [], targetItem: null },
        400,
      );
    }

    let limit = 3;
    if (limitParam) {
      const parsed = Number.parseInt(limitParam, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 20);
      }
    }

    try {
      const targetItem = await getItemInfo(c.env.DB, itemId);
      if (!targetItem) {
        return c.json({ items: [], targetItem: null });
      }
      const items = await getSimilarItems(c.env.DB, itemId, targetItem.slotId, limit, version);
      return c.json({ items, targetItem });
    } catch (e) {
      console.error('Similar items error:', e);
      return c.json(
        { error: 'Internal server error', items: [], targetItem: null },
        500,
      );
    }
  })
  .get('/robots.txt', (c) => {
    const origin = getSiteOrigin(c.req.url);
    return c.text(
      `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`,
      200,
      { 'Content-Type': 'text/plain; charset=utf-8' },
    );
  })
  .get('/sitemap.xml', async (c) => {
    const origin = getSiteOrigin(c.req.url);
    const result = await c.env.DB.prepare('SELECT id FROM items').all<{ id: string }>();
    const itemIds = result.results?.map((r) => r.id) ?? [];

    const fixedPages = ['/', '/ranking', '/faq', '/readme'];
    const urls = [
      ...fixedPages.map((path) => ({
        loc: `${origin}${path}`,
        priority: path === '/' ? '1.0' : '0.8',
      })),
      ...itemIds.map((id) => ({
        loc: `${origin}/item/${id}`,
        priority: '0.6',
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

    return c.body(xml, 200, {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400',
    });
  });

export type AppType = typeof routes;
export default routes;
