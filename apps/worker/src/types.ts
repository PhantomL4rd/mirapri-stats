import type { SlotPair } from '@mirapuri/shared';

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
 * POST /api/pairs リクエスト
 * Query: ?version=xxx (必須)
 */
export interface PairsRequest {
  pairs: Array<{
    slotPair: SlotPair;
    itemIdA: string;
    itemIdB: string;
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
}

/**
 * POST /api/sync/commit レスポンス
 */
export interface SyncCommitResponse {
  success: boolean;
  previousVersion: string;
  newVersion: string;
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
