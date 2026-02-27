import { itemsCache } from '@mirapri/shared';
import type * as schema from '@mirapri/shared/schema';
import { eq, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { parseItemIconUrl } from './parsers/item-page';
import type { HttpClient } from './utils/http-client';

/**
 * アイコンフェッチャーのオプション
 */
export interface IconFetcherOptions {
  db: PostgresJsDatabase<typeof schema>;
  httpClient: HttpClient;
  /** 最大取得件数（未指定で全件） */
  limit?: number | undefined;
  /** dry-run モード（DB 更新なし） */
  dryRun?: boolean | undefined;
}

/**
 * アイコンフェッチ結果
 */
export interface IconFetchResult {
  /** icon_url IS NULL のアイテム総数 */
  total: number;
  /** フェッチ成功件数 */
  fetched: number;
  /** フェッチ失敗件数 */
  failed: number;
  /** スキップ件数（dry-run 含む） */
  skipped: number;
}

/**
 * Lodestone 装備個別ページ URL を生成
 */
function getItemPageUrl(itemId: string): string {
  return `https://jp.finalfantasyxiv.com/lodestone/playguide/db/item/${itemId}/`;
}

/**
 * 経過時間をフォーマット
 */
function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * icon_url が未取得のアイテムに対して Lodestone からアイコン URL を取得し更新する
 */
export async function fetchMissingIcons(options: IconFetcherOptions): Promise<IconFetchResult> {
  const { db, httpClient, limit, dryRun = false } = options;

  // icon_url IS NULL のアイテムを取得
  const query = db
    .select({ id: itemsCache.id, name: itemsCache.name })
    .from(itemsCache)
    .where(isNull(itemsCache.iconUrl));

  const missingItems = limit ? await query.limit(limit) : await query;

  const result: IconFetchResult = {
    total: missingItems.length,
    fetched: 0,
    failed: 0,
    skipped: 0,
  };

  if (missingItems.length === 0) {
    console.log('[IconFetcher] No items with missing icon_url');
    return result;
  }

  console.log(`[IconFetcher] ${missingItems.length} items to process${dryRun ? ' (dry-run)' : ''}`);

  if (dryRun) {
    result.skipped = missingItems.length;
    return result;
  }

  const startTime = Date.now();

  for (let i = 0; i < missingItems.length; i++) {
    const item = missingItems[i]!;
    const url = getItemPageUrl(item.id);

    const elapsed = Date.now() - startTime;
    const avgMs = i > 0 ? elapsed / i : 0;
    const remaining = avgMs > 0 ? formatElapsed(avgMs * (missingItems.length - i)) : '?';

    process.stdout.write(
      `\r[IconFetcher] ${i + 1}/${missingItems.length} (ETA: ${remaining}) - ${item.name}`.padEnd(
        100,
      ),
    );

    const httpResult = await httpClient.fetchWithRateLimit(url);

    if (!httpResult.success || !httpResult.html) {
      console.log(
        `\n[IconFetcher] Failed to fetch ${item.id}: ${httpResult.error ?? `HTTP ${httpResult.statusCode}`}`,
      );
      result.failed++;
      continue;
    }

    const iconUrl = parseItemIconUrl(httpResult.html);

    if (!iconUrl) {
      console.log(`\n[IconFetcher] No og:image found for ${item.id} (${item.name})`);
      result.failed++;
      continue;
    }

    // items_cache.icon_url を更新
    await db.update(itemsCache).set({ iconUrl }).where(eq(itemsCache.id, item.id));
    result.fetched++;
  }

  // 最終行をクリア
  process.stdout.write(`${'\r'.padEnd(100)}\r`);
  console.log(`[IconFetcher] Done: ${result.fetched} fetched, ${result.failed} failed`);

  return result;
}
