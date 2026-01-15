import {
  charactersGlamour,
  crawlProgress,
  itemsCache,
  SLOT_PAIR_CONFIG,
  SLOT_PAIRS,
  type SlotPair,
} from '@mirapuri/shared';
import type * as schema from '@mirapuri/shared/schema';
import { count, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { AggregatedPair, AggregatedUsage, ExtractedItem } from './types.js';

export interface AggregatorDependencies {
  db: PostgresJsDatabase<typeof schema>;
}

export interface Aggregator {
  extractUniqueItems(): Promise<ExtractedItem[]>;
  aggregateUsage(): Promise<AggregatedUsage[]>;
  aggregatePairs(): Promise<AggregatedPair[]>;
  /** scraper が全完了しているか確認 */
  isCrawlComplete(): Promise<boolean>;
  /** Supabase のデータをクリーンアップ（sync 成功後に呼び出し） */
  cleanup(): Promise<void>;
}

/**
 * Aggregator Factory
 */
export function createAggregator(deps: AggregatorDependencies): Aggregator {
  const { db } = deps;

  return {
    /**
     * items_cache テーブルからアイテム情報を取得
     */
    async extractUniqueItems(): Promise<ExtractedItem[]> {
      const result = await db
        .select({
          id: itemsCache.id,
          name: itemsCache.name,
          slotId: itemsCache.slotId,
        })
        .from(itemsCache);

      return result;
    },

    /**
     * アイテムごとの使用回数を集計
     */
    async aggregateUsage(): Promise<AggregatedUsage[]> {
      const result = await db
        .select({
          itemId: charactersGlamour.itemId,
          usageCount: count(),
        })
        .from(charactersGlamour)
        .groupBy(charactersGlamour.itemId);

      return result.map((row) => ({
        itemId: row.itemId,
        usageCount: Number(row.usageCount),
      }));
    },

    /**
     * ペア組み合わせを集計（4パターン、各アイテム上位10件のみ）
     */
    async aggregatePairs(): Promise<AggregatedPair[]> {
      const allPairs: AggregatedPair[] = [];

      for (const slotPair of SLOT_PAIRS) {
        const config = SLOT_PAIR_CONFIG[slotPair];
        const pairs = await aggregatePairForSlot(db, slotPair, config.slotA, config.slotB);
        allPairs.push(...pairs);
      }

      return allPairs;
    },

    /**
     * scraper が全完了しているか確認
     * crawl_progress の lastCompletedIndex が totalKeys - 1 以上なら完了
     */
    async isCrawlComplete(): Promise<boolean> {
      const result = await db.select().from(crawlProgress).limit(1);

      if (result.length === 0) {
        // 進捗レコードがない = まだ開始していない
        return false;
      }

      const progress = result[0]!.progress;
      return progress.lastCompletedIndex >= progress.totalKeys - 1;
    },

    /**
     * Supabase のデータをクリーンアップ
     * characters_glamour, items_cache, crawl_progress を削除
     */
    async cleanup(): Promise<void> {
      await db.delete(charactersGlamour);
      await db.delete(itemsCache);
      await db.delete(crawlProgress);
    },
  };
}

/**
 * 特定のスロットペアに対するペア集計
 */
async function aggregatePairForSlot(
  db: PostgresJsDatabase<typeof schema>,
  slotPair: SlotPair,
  slotIdA: number,
  slotIdB: number,
): Promise<AggregatedPair[]> {
  // 同一キャラクターの slotA と slotB の装備を結合してペアをカウント
  const result = await db.execute(sql`
    WITH pairs AS (
      SELECT
        a.item_id AS item_id_a,
        b.item_id AS item_id_b,
        COUNT(*) AS pair_count
      FROM characters_glamour a
      INNER JOIN characters_glamour b ON a.character_id = b.character_id
      WHERE a.slot_id = ${slotIdA}
        AND b.slot_id = ${slotIdB}
      GROUP BY a.item_id, b.item_id
    ),
    ranked AS (
      SELECT
        item_id_a,
        item_id_b,
        pair_count,
        ROW_NUMBER() OVER (PARTITION BY item_id_a ORDER BY pair_count DESC) AS rank
      FROM pairs
    )
    SELECT item_id_a, item_id_b, pair_count, rank
    FROM ranked
    WHERE rank <= 10
    ORDER BY item_id_a, rank
  `);

  return (
    result as unknown as Array<{
      item_id_a: string;
      item_id_b: string;
      pair_count: string;
      rank: string;
    }>
  ).map((row) => ({
    slotPair,
    itemIdA: row.item_id_a,
    itemIdB: row.item_id_b,
    pairCount: Number(row.pair_count),
    rank: Number(row.rank),
  }));
}
