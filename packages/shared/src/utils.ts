/**
 * 配列を指定サイズのチャンクに分割する
 */
export function chunk<T>(array: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * D1 の bind variable 上限
 * @see https://github.com/drizzle-team/drizzle-orm/issues/2479
 */
const D1_MAX_BOUND_PARAMS = 100;

/**
 * D1 バルク INSERT のオプション
 */
export interface BulkInsertD1Options<T extends Record<string, unknown>> {
  /** INSERT するレコード配列 */
  items: readonly T[];
  /** 1チャンクの処理コールバック。db.insert().values(batch) などを実行する */
  onBatch: (batch: T[]) => Promise<unknown>;
}

/**
 * D1 の bind variable 上限（100）を考慮して、レコードを安全なサイズに
 * 自動分割してバッチ INSERT する。
 *
 * カラム数は最初のレコードのキー数から自動計算するため、
 * テーブルのカラムが増減しても手動で BATCH_SIZE を調整する必要がない。
 *
 * @returns 各バッチの実行結果の配列
 *
 * @example
 * ```ts
 * const results = await bulkInsertD1({
 *   items: values,
 *   onBatch: (batch) => db.insert(items).values(batch),
 * });
 * ```
 *
 * @see https://github.com/drizzle-team/drizzle-orm/issues/2479
 */
export async function bulkInsertD1<T extends Record<string, unknown>>(
  options: BulkInsertD1Options<T>,
): Promise<unknown[]> {
  const { items, onBatch } = options;

  if (items.length === 0) return [];

  const columnsPerRow = Object.keys(items[0]!).length || 1;
  const safeBatchSize = Math.max(1, Math.floor(D1_MAX_BOUND_PARAMS / columnsPerRow));

  const batches = chunk(items, safeBatchSize);
  const results: unknown[] = [];
  for (const batch of batches) {
    results.push(await onBatch(batch));
  }
  return results;
}

/**
 * Drizzle ORM D1 の結果オブジェクトから変更行数を取得する
 *
 * Drizzle の D1 ドライバはバージョンにより結果形式が異なる:
 * - `result.meta.changes` — 新しい形式
 * - `result.rowsAffected` — 古い形式
 *
 * どちらも取得できない場合は fallback 値を返す。
 */
export function getChanges(result: unknown, fallback: number): number {
  const r = result as { meta?: { changes?: number }; rowsAffected?: number };
  return r.meta?.changes ?? r.rowsAffected ?? fallback;
}

/**
 * スロットIDの有効範囲
 */
export const MIN_SLOT_ID = 1;
export const MAX_SLOT_ID = 5;

/**
 * スロットIDが有効な範囲内かチェックする
 */
export function isValidSlotId(slotId: number): boolean {
  return Number.isInteger(slotId) && slotId >= MIN_SLOT_ID && slotId <= MAX_SLOT_ID;
}

/**
 * 指定ミリ秒待機する
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    (globalThis as unknown as { setTimeout: (fn: () => void, ms: number) => void }).setTimeout(
      resolve,
      ms,
    );
  });
}
