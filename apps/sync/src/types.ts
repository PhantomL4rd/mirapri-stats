/**
 * CLI オプション
 */
export interface SyncOptions {
  itemsOnly: boolean;
  statsOnly: boolean;
  dryRun: boolean;
  /** 同期成功後の Supabase クリーンアップをスキップ（動作確認期間用、省略時 false） */
  skipCleanup?: boolean;
}

/**
 * 同期結果
 */
export interface SyncResult {
  itemsInserted: number;
  itemsSkipped: number;
  usageInserted: number;
  pairsInserted: number;
  dyeCombosInserted: number;
  errors: string[];
}

/**
 * 進捗情報
 */
export interface SyncProgress {
  phase: 'items' | 'usage' | 'pairs' | 'dye_combos' | 'cleanup';
  processed: number;
  total: number;
  errors: number;
}

/**
 * 抽出されたアイテム情報
 */
export interface ExtractedItem {
  id: string;
  name: string;
  slotId: number;
  iconUrl: string | null;
}

/**
 * 集計された使用回数
 */
export interface AggregatedUsage {
  slotId: number;
  itemId: string;
  usageCount: number;
}

/**
 * 集計された染色組み合わせ
 */
export interface AggregatedDyeCombo {
  slotId: number;
  itemId: string;
  /** 主染色JP名（null = 未染色） */
  stain1Name: string | null;
  /** 副染色JP名（null = 未染色） */
  stain2Name: string | null;
  comboCount: number;
  rank: number;
}

/**
 * カララント情報（dyes.json + ja/dye.json から取得）
 */
export interface StainInfo {
  /** JP名（PK） */
  name: string;
  /** colorant-picker 内部ID（dye_NNN、traceability 用） */
  dyeId: string | null;
  category: string | null;
  r: number;
  g: number;
  b: number;
}

/**
 * 集計されたペア組み合わせ（双方向対応）
 */
export interface AggregatedPair {
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
}

/**
 * Writer Client 設定
 */
export interface WriterClientConfig {
  baseUrl: string;
  authToken: string;
  /** Cloudflare Access Client ID (オプション) */
  cfAccessClientId?: string;
  /** Cloudflare Access Client Secret (オプション) */
  cfAccessClientSecret?: string;
  retryCount?: number;
  /** 並列リクエスト数（デフォルト: 3） */
  concurrency?: number;
  chunkSizes?: {
    items?: number;
    usage?: number;
    pairs?: number;
    dyeCombos?: number;
    stains?: number;
  };
}

/**
 * Writer API レスポンス（共通）
 */
export interface WriterResponse {
  success: boolean;
  inserted?: number;
  skipped?: number;
  upserted?: number;
}
