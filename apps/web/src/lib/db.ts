import type { D1Database } from '@cloudflare/workers-types';

/**
 * active_version を取得（sync_versions の最新バージョン）
 */
export async function getActiveVersion(db: D1Database): Promise<string> {
  const result = await db
    .prepare('SELECT version FROM sync_versions ORDER BY synced_at DESC LIMIT 1')
    .first<{ version: string }>();
  return result?.version ?? '0';
}

/**
 * バージョン情報
 */
export interface VersionInfo {
  version: string;
  dataFrom: string | null;
  dataTo: string | null;
  syncedAt: string;
  isActive: boolean;
}

/**
 * 利用可能なバージョン一覧を取得（sync_versions テーブルから）
 * synced_at 降順で並び替え
 */
export async function getAvailableVersions(db: D1Database): Promise<VersionInfo[]> {
  const activeVersion = await getActiveVersion(db);

  const result = await db
    .prepare(
      'SELECT version, data_from, data_to, synced_at FROM sync_versions ORDER BY synced_at DESC',
    )
    .all<{
      version: string;
      data_from: string | null;
      data_to: string | null;
      synced_at: string;
    }>();

  return (result.results ?? []).map((row) => ({
    version: row.version,
    dataFrom: row.data_from,
    dataTo: row.data_to,
    syncedAt: row.synced_at,
    isActive: row.version === activeVersion,
  }));
}

/**
 * リクエストされたバージョンを検証し、有効なバージョンを返す
 * - requestedVersion が null または空の場合は active_version を返す
 * - requestedVersion が sync_versions に存在しない場合は active_version を返す
 *
 * @param db D1Database
 * @param requestedVersion URLパラメータから取得したバージョン
 */
export async function getQueryVersion(
  db: D1Database,
  requestedVersion: string | null,
): Promise<string> {
  const activeVersion = await getActiveVersion(db);

  if (!requestedVersion || requestedVersion === activeVersion) {
    return activeVersion;
  }

  // リクエストされたバージョンが存在するか確認
  const exists = await db
    .prepare('SELECT 1 FROM sync_versions WHERE version = ?')
    .bind(requestedVersion)
    .first();

  return exists ? requestedVersion : activeVersion;
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

/**
 * URL クエリパラメータからスロットキーを安全にパースする
 * 不正な値の場合はデフォルト 'body' を返す
 */
export function parseSlotParam(param: string | null): keyof typeof SLOT_IDS {
  const slot = param ?? 'body';
  return slot in SLOT_IDS ? (slot as keyof typeof SLOT_IDS) : 'body';
}

/**
 * バージョン解決結果
 */
export interface VersionContext {
  versions: VersionInfo[];
  currentVersion: string;
  isActiveVersion: boolean;
  /** テンプレートのリンクに使うバージョン。最新なら undefined */
  linkVersion: string | undefined;
  /** 最新バージョンが URL に明示されている場合 true（リダイレクトすべき） */
  shouldRedirect: boolean;
}

/**
 * バージョン一覧の取得・検証・リダイレクト判定をまとめて行う
 *
 * 3つのページ（ranking, index, item/[itemId]）で同一のパターンが
 * 繰り返されていたため、ヘルパーとして抽出した。
 */
export async function resolveVersionContext(
  db: D1Database,
  versionParam: string | null,
): Promise<VersionContext> {
  const versions = await getAvailableVersions(db);
  const currentVersion = await getQueryVersion(db, versionParam);
  const isActiveVersion = versions.find((v) => v.version === currentVersion)?.isActive ?? true;
  const shouldRedirect = !!(versionParam && isActiveVersion);
  const linkVersion = isActiveVersion ? undefined : currentVersion;

  return { versions, currentVersion, isActiveVersion, linkVersion, shouldRedirect };
}
