import type { NewUsageTrend } from '@mirapri/shared/d1-schema';
import { describe, expect, it, vi } from 'vitest';
import type { TrendCalculatorDependencies } from './trend-calculator.js';
import { createTrendCalculator } from './trend-calculator.js';

/** insertedRows から itemId でトレンド行を検索するヘルパー */
function findTrend(rows: NewUsageTrend[], itemId: string): NewUsageTrend | undefined {
  return rows.find((r) => r.itemId === itemId);
}

/**
 * select チェーンのモックを順番に返すヘルパー
 * 実装側が select().from().where().get/all() のように呼ぶので
 * 各呼び出しごとに末端の結果を制御する
 */
function createSequentialSelectMock(steps: Array<{ get?: unknown; all?: unknown[] }>) {
  let callIndex = 0;
  return vi.fn(() => {
    const step = steps[callIndex++] ?? { get: undefined, all: [] };
    return {
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn().mockResolvedValue(step.get),
          all: vi.fn().mockResolvedValue(step.all ?? []),
          orderBy: vi.fn(() => ({
            get: vi.fn().mockResolvedValue(step.get),
            all: vi.fn().mockResolvedValue(step.all ?? []),
          })),
        })),
        orderBy: vi.fn(() => ({
          get: vi.fn().mockResolvedValue(step.get),
          all: vi.fn().mockResolvedValue(step.all ?? []),
        })),
        all: vi.fn().mockResolvedValue(step.all ?? []),
      })),
    };
  });
}

/**
 * bulkInsertD1 対応のモック DB を作成するヘルパー
 * insert().values() で行をキャプチャし、Promise を返す
 */
function createBatchMockDb(
  mockSelect: ReturnType<typeof createSequentialSelectMock>,
  insertedRows: NewUsageTrend[],
) {
  const insertValues = vi.fn((rows: unknown) => {
    if (Array.isArray(rows)) insertedRows.push(...(rows as NewUsageTrend[]));
    return Promise.resolve({ rowsAffected: Array.isArray(rows) ? rows.length : 0 });
  });

  return {
    select: mockSelect,
    insert: vi.fn(() => ({ values: insertValues })),
  } as unknown as TrendCalculatorDependencies['db'];
}

describe('TrendCalculator', () => {
  describe('computeAndStoreTrends', () => {
    it('新旧バージョンの使用数差分を正しく計算する', async () => {
      const insertedRows: NewUsageTrend[] = [];

      // 呼び出し順:
      // 1. hasTrendsForVersion → get: undefined (未計算)
      // 2. getSnapshotDate → get: { dataTo: '2026-03-01' }
      // 3. getUsageByVersion(new) → all: [...]
      // 4. getUsageByVersion(prev) → all: [...]
      const mockSelect = createSequentialSelectMock([
        { get: undefined },
        { get: { dataTo: '2026-03-01T00:00:00Z' } },
        {
          all: [
            { slotId: 2, itemId: 'item-a', usageCount: 100 },
            { slotId: 2, itemId: 'item-b', usageCount: 50 },
          ],
        },
        {
          all: [
            { slotId: 2, itemId: 'item-a', usageCount: 80 },
            { slotId: 2, itemId: 'item-b', usageCount: 60 },
          ],
        },
      ]);

      const db = createBatchMockDb(mockSelect, insertedRows);

      const tc = createTrendCalculator({ db });
      const count = await tc.computeAndStoreTrends('v2', 'v1');

      // 2アイテム分の trend 行が INSERT される
      expect(count).toBe(2);
      expect(insertedRows.length).toBe(2);

      // item-a: 100-80=+20, rank 1→1, delta=0
      const itemA = findTrend(insertedRows, 'item-a');
      expect(itemA?.usageDelta).toBe(20);
      expect(itemA?.rankNew).toBe(1);
      expect(itemA?.rankPrev).toBe(1);
      expect(itemA?.rankDelta).toBe(0);

      // item-b: 50-60=-10, rank 2→2, delta=0
      const itemB = findTrend(insertedRows, 'item-b');
      expect(itemB?.usageDelta).toBe(-10);
      expect(itemB?.rankNew).toBe(2);
      expect(itemB?.rankPrev).toBe(2);
      expect(itemB?.rankDelta).toBe(0);
    });

    it('新登場アイテムは rank_prev=NULL, rank_delta=NULL になる', async () => {
      const insertedRows: NewUsageTrend[] = [];

      const mockSelect = createSequentialSelectMock([
        { get: undefined }, // hasTrendsForVersion
        { get: { dataTo: '2026-03-01T00:00:00Z' } }, // getSnapshotDate
        {
          // new usage: item-a(既存) + item-c(新登場)
          all: [
            { slotId: 2, itemId: 'item-a', usageCount: 100 },
            { slotId: 2, itemId: 'item-c', usageCount: 30 },
          ],
        },
        {
          // prev usage: item-a のみ
          all: [{ slotId: 2, itemId: 'item-a', usageCount: 80 }],
        },
      ]);

      const db = createBatchMockDb(mockSelect, insertedRows);

      const tc = createTrendCalculator({ db });
      await tc.computeAndStoreTrends('v2', 'v1');

      const newItem = findTrend(insertedRows, 'item-c');
      expect(newItem).toBeDefined();
      expect(newItem?.usageCountPrev).toBe(0);
      expect(newItem?.usageDelta).toBe(30);
      expect(newItem?.rankPrev).toBeNull();
      expect(newItem?.rankDelta).toBeNull();
    });

    it('消滅アイテムは usage_count_new=0 で usage_delta が負になる', async () => {
      const insertedRows: NewUsageTrend[] = [];

      const mockSelect = createSequentialSelectMock([
        { get: undefined }, // hasTrendsForVersion
        { get: { dataTo: '2026-03-01T00:00:00Z' } }, // getSnapshotDate
        {
          // new usage: item-a のみ
          all: [{ slotId: 2, itemId: 'item-a', usageCount: 100 }],
        },
        {
          // prev usage: item-a + item-d(消滅)
          all: [
            { slotId: 2, itemId: 'item-a', usageCount: 80 },
            { slotId: 2, itemId: 'item-d', usageCount: 40 },
          ],
        },
      ]);

      const db = createBatchMockDb(mockSelect, insertedRows);

      const tc = createTrendCalculator({ db });
      await tc.computeAndStoreTrends('v2', 'v1');

      const gone = findTrend(insertedRows, 'item-d');
      expect(gone).toBeDefined();
      expect(gone?.usageCountNew).toBe(0);
      expect(gone?.usageDelta).toBe(-40);
    });

    it('ランク変動が正しく計算される（正の値 = 順位上昇）', async () => {
      const insertedRows: NewUsageTrend[] = [];

      const mockSelect = createSequentialSelectMock([
        { get: undefined },
        { get: { dataTo: '2026-03-01T00:00:00Z' } },
        {
          // new: a=1位, b=2位, c=3位
          all: [
            { slotId: 2, itemId: 'item-a', usageCount: 100 },
            { slotId: 2, itemId: 'item-b', usageCount: 80 },
            { slotId: 2, itemId: 'item-c', usageCount: 60 },
          ],
        },
        {
          // prev: b=1位, c=2位, a=3位
          all: [
            { slotId: 2, itemId: 'item-b', usageCount: 100 },
            { slotId: 2, itemId: 'item-c', usageCount: 80 },
            { slotId: 2, itemId: 'item-a', usageCount: 60 },
          ],
        },
      ]);

      const db = createBatchMockDb(mockSelect, insertedRows);

      const tc = createTrendCalculator({ db });
      await tc.computeAndStoreTrends('v2', 'v1');

      // item-a: 3位→1位, rankDelta = 3-1 = +2（上昇）
      const a = findTrend(insertedRows, 'item-a');
      expect(a?.rankNew).toBe(1);
      expect(a?.rankPrev).toBe(3);
      expect(a?.rankDelta).toBe(2);

      // item-b: 1位→2位, rankDelta = 1-2 = -1（下降）
      const b = findTrend(insertedRows, 'item-b');
      expect(b?.rankNew).toBe(2);
      expect(b?.rankPrev).toBe(1);
      expect(b?.rankDelta).toBe(-1);
    });

    it('100件でも bulkInsertD1 で自動チャンクされる', async () => {
      // 100 アイテム生成
      const items = Array.from({ length: 100 }, (_, i) => ({
        slotId: 2,
        itemId: `item-${i}`,
        usageCount: 100 - i,
      }));

      const mockSelect = createSequentialSelectMock([
        { get: undefined },
        { get: { dataTo: '2026-03-01T00:00:00Z' } },
        { all: items },
        { all: items.map((item) => ({ ...item, usageCount: item.usageCount - 10 })) },
      ]);

      const mockValues = vi.fn().mockResolvedValue({ rowsAffected: 0 });
      const mockInsert = vi.fn(() => ({ values: mockValues }));

      const db = {
        select: mockSelect,
        insert: mockInsert,
      } as unknown as TrendCalculatorDependencies['db'];

      const tc = createTrendCalculator({ db });
      const count = await tc.computeAndStoreTrends('v2', 'v1');

      expect(count).toBe(100);
      // bulkInsertD1 がカラム数から自動計算したチャンクサイズで分割
      // usage_trends は 11 カラム → floor(100/11)=9 件/チャンク → ceil(100/9)=12 回
      expect(mockValues.mock.calls.length).toBe(12);
    });

    it('data_to が null の場合はフォールバック日時を使用する', async () => {
      const insertedRows: NewUsageTrend[] = [];

      const mockSelect = createSequentialSelectMock([
        { get: undefined },
        { get: { dataTo: null } }, // data_to が null
        { all: [{ slotId: 2, itemId: 'item-a', usageCount: 100 }] },
        { all: [{ slotId: 2, itemId: 'item-a', usageCount: 80 }] },
      ]);

      const db = createBatchMockDb(mockSelect, insertedRows);

      const tc = createTrendCalculator({ db });
      await tc.computeAndStoreTrends('v2', 'v1');

      const row = insertedRows[0];
      // フォールバック日時（ISO8601形式の文字列）
      expect(row?.snapshotDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('既に計算済みのバージョンはスキップして 0 を返す', async () => {
      const mockSelect = createSequentialSelectMock([
        { get: { newVersion: 'v2' } }, // hasTrendsForVersion → 既に存在
      ]);

      const db = {
        select: mockSelect,
        insert: vi.fn(),
      } as unknown as TrendCalculatorDependencies['db'];

      const tc = createTrendCalculator({ db });
      const count = await tc.computeAndStoreTrends('v2', 'v1');

      expect(count).toBe(0);
    });
  });
});
