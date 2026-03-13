import { syncVersions, usage, usageTrends } from '@mirapri/shared/d1-schema';
import { bulkInsertD1 } from '@mirapri/shared/utils';
import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

export interface TrendCalculator {
  /** 指定2バージョン間の差分を計算・保存。INSERT した行数を返す */
  computeAndStoreTrends(newVersion: string, prevVersion: string): Promise<number>;
}

export interface TrendCalculatorDependencies {
  db: DrizzleD1Database;
}

interface UsageRow {
  slotId: number;
  itemId: string;
  usageCount: number;
}

/**
 * TrendCalculator Factory
 */
export function createTrendCalculator(deps: TrendCalculatorDependencies): TrendCalculator {
  const { db } = deps;

  async function getSnapshotDate(version: string): Promise<string> {
    const row = await db
      .select({ dataTo: syncVersions.dataTo })
      .from(syncVersions)
      .where(eq(syncVersions.version, version))
      .get();

    return row?.dataTo ?? new Date().toISOString();
  }

  async function getUsageByVersion(version: string): Promise<UsageRow[]> {
    const rows = await db
      .select({
        slotId: usage.slotId,
        itemId: usage.itemId,
        usageCount: usage.usageCount,
      })
      .from(usage)
      .where(eq(usage.version, version))
      .all();

    return rows;
  }

  /**
   * スロット別にランクを計算（usageCount DESC）
   * 同一 usageCount は同順位
   */
  function computeRanks(rows: UsageRow[]): Map<string, Map<string, number>> {
    // slotId → itemId[] (usageCount DESC)
    const bySlot = new Map<number, UsageRow[]>();
    for (const row of rows) {
      const arr = bySlot.get(row.slotId) ?? [];
      arr.push(row);
      bySlot.set(row.slotId, arr);
    }

    // slotId → (itemId → rank)
    const result = new Map<string, Map<string, number>>();
    for (const [slotId, slotRows] of bySlot) {
      slotRows.sort((a, b) => b.usageCount - a.usageCount);
      const rankMap = new Map<string, number>();
      let rank = 1;
      for (let i = 0; i < slotRows.length; i++) {
        const current = slotRows[i];
        const prev = slotRows[i - 1];
        if (!current) continue;
        if (i > 0 && prev && current.usageCount < prev.usageCount) {
          rank = i + 1;
        }
        rankMap.set(current.itemId, rank);
      }
      result.set(String(slotId), rankMap);
    }
    return result;
  }

  async function hasTrendsForVersion(newVersion: string): Promise<boolean> {
    const row = await db
      .select({ newVersion: usageTrends.newVersion })
      .from(usageTrends)
      .where(eq(usageTrends.newVersion, newVersion))
      .get();

    return row !== undefined;
  }

  return {
    async computeAndStoreTrends(newVersion: string, prevVersion: string): Promise<number> {
      // 既に計算済みならスキップ
      if (await hasTrendsForVersion(newVersion)) {
        return 0;
      }

      const snapshotDate = await getSnapshotDate(newVersion);
      const [newUsage, prevUsage] = await Promise.all([
        getUsageByVersion(newVersion),
        getUsageByVersion(prevVersion),
      ]);

      // usageCount の Map を構築: "slotId:itemId" → usageCount
      const newMap = new Map<string, UsageRow>();
      for (const row of newUsage) {
        newMap.set(`${row.slotId}:${row.itemId}`, row);
      }
      const prevMap = new Map<string, UsageRow>();
      for (const row of prevUsage) {
        prevMap.set(`${row.slotId}:${row.itemId}`, row);
      }

      // ランク計算
      const newRanks = computeRanks(newUsage);
      const prevRanks = computeRanks(prevUsage);

      // 全アイテムの union
      const allKeys = new Set([...newMap.keys(), ...prevMap.keys()]);

      // trend 行を生成
      const trendRows: Array<typeof usageTrends.$inferInsert> = [];
      for (const key of allKeys) {
        const parts = key.split(':');
        const slotIdStr = parts[0] ?? '';
        const itemId = parts[1] ?? '';
        const slotId = Number(slotIdStr);

        const newRow = newMap.get(key);
        const prevRow = prevMap.get(key);

        const usageCountNew = newRow?.usageCount ?? 0;
        const usageCountPrev = prevRow?.usageCount ?? 0;
        const usageDelta = usageCountNew - usageCountPrev;

        const rankNew = newRanks.get(slotIdStr)?.get(itemId) ?? newUsage.length + 1;
        const rankPrev = prevRow ? (prevRanks.get(slotIdStr)?.get(itemId) ?? null) : null;
        const rankDelta = rankPrev !== null ? rankPrev - rankNew : null;

        // 新バージョンでも旧バージョンでも存在しない場合はスキップ（理論上ないが安全策）
        if (usageCountNew === 0 && usageCountPrev === 0) continue;

        trendRows.push({
          newVersion,
          prevVersion,
          snapshotDate,
          slotId,
          itemId,
          usageCountNew,
          usageCountPrev,
          usageDelta,
          rankNew,
          rankPrev,
          rankDelta,
        });
      }

      // D1制限回避のためバッチ分割し、db.batch()で一括実行
      if (trendRows.length > 0) {
        await bulkInsertD1({
          items: trendRows,
          onBatch: (batch) => db.insert(usageTrends).values(batch),
        });
      }

      return trendRows.length;
    },
  };
}
