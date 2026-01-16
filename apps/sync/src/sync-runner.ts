import type { Aggregator } from './aggregator.js';
import type { SyncOptions, SyncProgress, SyncResult } from './types.js';
import type { WorkerClient } from './worker-client.js';

export interface SyncRunnerDependencies {
  aggregator: Aggregator;
  client: WorkerClient;
  onProgress?: (progress: SyncProgress) => void;
}

/**
 * コア同期ロジック
 * 3フェーズ同期フロー: startSync → データ送信 → commitSync/abortSync
 */
export async function runSync(
  deps: SyncRunnerDependencies,
  options: SyncOptions,
): Promise<SyncResult> {
  const { aggregator, client, onProgress } = deps;

  const result: SyncResult = {
    itemsInserted: 0,
    itemsSkipped: 0,
    usageInserted: 0,
    pairsInserted: 0,
    errors: [],
  };

  // 全完了チェック（dry-run 以外）
  if (!options.dryRun) {
    const isComplete = await aggregator.isCrawlComplete();
    if (!isComplete) {
      result.errors.push('Scraper not finished yet, skipping sync');
      return result;
    }
  }

  // Items sync (バージョン管理不要)
  if (!options.statsOnly) {
    const items = await aggregator.extractUniqueItems();

    if (!options.dryRun) {
      const progress: SyncProgress = {
        phase: 'items',
        processed: 0,
        total: items.length,
        errors: 0,
      };
      try {
        const itemsResult = await client.postItems(items);
        result.itemsInserted = itemsResult.inserted;
        result.itemsSkipped = itemsResult.skipped;
        progress.processed = items.length;
        onProgress?.(progress);
      } catch (error) {
        result.errors.push(`Items sync failed: ${(error as Error).message}`);
        progress.errors++;
        onProgress?.(progress);
      }
    }
  }

  // Stats sync (バージョン管理必要: usage + pairs)
  if (!options.itemsOnly && !options.dryRun) {
    let version: string | null = null;

    try {
      // Phase 1: Sync セッション開始
      const startResult = await client.startSync();
      version = startResult.version;

      // Phase 2: Usage データ送信
      const usage = await aggregator.aggregateUsage();
      const usageProgress: SyncProgress = {
        phase: 'usage',
        processed: 0,
        total: usage.length,
        errors: 0,
      };
      const usageResult = await client.postUsage(version, usage);
      result.usageInserted = usageResult.inserted;
      usageProgress.processed = usage.length;
      onProgress?.(usageProgress);

      // Phase 2: Pairs データ送信
      const pairs = await aggregator.aggregatePairs();
      const pairsProgress: SyncProgress = {
        phase: 'pairs',
        processed: 0,
        total: pairs.length,
        errors: 0,
      };
      const pairsResult = await client.postPairs(version, pairs);
      result.pairsInserted = pairsResult.inserted;
      pairsProgress.processed = pairs.length;
      onProgress?.(pairsProgress);

      // Phase 3: コミット（アトミック切り替え）
      await client.commitSync(version);
    } catch (error) {
      result.errors.push(`Stats sync failed: ${(error as Error).message}`);

      // エラー時は abort してロールバック
      if (version) {
        try {
          await client.abortSync(version);
        } catch (abortError) {
          result.errors.push(`Abort failed: ${(abortError as Error).message}`);
        }
      }
    }
  }

  // Cleanup (sync 成功時のみ、dry-run 以外)
  if (!options.dryRun && result.errors.length === 0) {
    const progress: SyncProgress = {
      phase: 'cleanup',
      processed: 0,
      total: 3,
      errors: 0,
    };
    try {
      await aggregator.cleanup();
      progress.processed = 3;
      onProgress?.(progress);
    } catch (error) {
      result.errors.push(`Cleanup failed: ${(error as Error).message}`);
      progress.errors++;
      onProgress?.(progress);
    }
  }

  return result;
}

/**
 * 進捗をフォーマット
 */
export function formatProgress(progress: SyncProgress): string {
  const percent = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;
  return `[${progress.phase}] ${progress.processed}/${progress.total} (${percent}%)${progress.errors > 0 ? `, errors: ${progress.errors}` : ''}`;
}
