/**
 * Cloudflare Worker 環境変数
 */
export interface Env {
  DB: D1Database;
  AUTH_TOKEN: string;
}

/**
 * POST /api/items リクエスト
 */
export interface ItemsRequest {
  items: Array<{
    id: string;
    name: string;
    slotId: number;
    iconUrl?: string | null;
  }>;
}

/**
 * POST /api/items レスポンス
 */
export interface ItemsResponse {
  success: boolean;
  inserted: number;
  skipped: number;
}

/**
 * POST /api/usage リクエスト
 * Query: ?version=xxx (必須)
 */
export interface UsageRequest {
  usage: Array<{
    slotId: number;
    itemId: string;
    usageCount: number;
  }>;
}

/**
 * POST /api/usage レスポンス
 */
export interface UsageResponse {
  success: boolean;
  inserted: number;
}

/**
 * POST /api/pairs リクエスト（双方向対応）
 * Query: ?version=xxx (必須)
 */
export interface PairsRequest {
  pairs: Array<{
    /** 主語側スロット (1-5) */
    baseSlotId: number;
    /** 相方側スロット (1-5) */
    partnerSlotId: number;
    /** 主語アイテム */
    baseItemId: string;
    /** 相方アイテム */
    partnerItemId: string;
    pairCount: number;
    rank: number;
  }>;
}

/**
 * POST /api/pairs レスポンス
 */
export interface PairsResponse {
  success: boolean;
  inserted: number;
}

/**
 * POST /api/stains リクエスト
 * カララント（染色）マスタを一括 UPSERT
 */
export interface StainsRequest {
  stains: Array<{
    /** JP色名（PK） */
    name: string;
    /** colorant-picker 内部ID（dye_NNN、traceability 用） */
    dyeId?: string | null;
    category?: string | null;
    r: number;
    g: number;
    b: number;
  }>;
}

/**
 * POST /api/stains レスポンス
 */
export interface StainsResponse {
  success: boolean;
  inserted: number;
}

/**
 * POST /api/dye-combos リクエスト
 * Query: ?version=xxx (必須)
 */
export interface DyeCombosRequest {
  combos: Array<{
    slotId: number;
    itemId: string;
    /** 主染色JP名（null = 未染色） */
    stain1Name: string | null;
    /** 副染色JP名（null = 未染色） */
    stain2Name: string | null;
    comboCount: number;
    rank: number;
  }>;
}

/**
 * POST /api/dye-combos レスポンス
 */
export interface DyeCombosResponse {
  success: boolean;
  inserted: number;
}

/**
 * POST /api/sync/start レスポンス
 */
export interface SyncStartResponse {
  success: boolean;
  version: string;
}

/**
 * POST /api/sync/commit リクエスト
 */
export interface SyncCommitRequest {
  version: string;
  /** データ取得期間（最も古い fetched_at）ISO8601 */
  dataFrom?: string;
  /** データ取得期間（最も新しい fetched_at）ISO8601 */
  dataTo?: string;
}

/**
 * POST /api/sync/commit レスポンス
 */
export interface SyncCommitResponse {
  success: boolean;
  previousVersion: string;
  newVersion: string;
  trendsComputed: number;
  trendsWarning?: string;
}

/**
 * POST /api/sync/abort リクエスト
 */
export interface SyncAbortRequest {
  version: string;
}

/**
 * POST /api/sync/abort レスポンス
 */
export interface SyncAbortResponse {
  success: boolean;
  deletedVersion: string;
}
