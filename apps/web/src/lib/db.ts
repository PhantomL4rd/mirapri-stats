import type { D1Database } from '@cloudflare/workers-types';

/**
 * active_version を取得
 */
export async function getActiveVersion(db: D1Database): Promise<string> {
  const result = await db
    .prepare('SELECT value FROM meta WHERE key = ?')
    .bind('active_version')
    .first<{ value: string }>();
  return result?.value ?? '0';
}

/**
 * スロットID → スロット名
 */
export const SLOT_NAMES: Record<number, string> = {
  1: '頭',
  2: '胴',
  3: '手',
  4: '脚',
  5: '足',
} as const;

/**
 * スロット名 → スロットID
 */
export const SLOT_IDS: Record<string, number> = {
  head: 1,
  body: 2,
  hands: 3,
  legs: 4,
  feet: 5,
} as const;
