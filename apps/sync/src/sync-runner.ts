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
 */
export async function runSync(
  deps: SyncRunnerDependencies,
  options: SyncOptions,
): Promise<SyncResult> {
  const { aggregator, client, onProgress } = deps;

  const result: SyncResult = {
    itemsInserted: 0,
    itemsSkipped: 0,
    usageUpserted: 0,
    pairsUpserted: 0,
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

  // Items sync
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

  // Usage sync
  if (!options.itemsOnly) {
    const usage = await aggregator.aggregateUsage();

    if (!options.dryRun) {
      const progress: SyncProgress = {
        phase: 'usage',
        processed: 0,
        total: usage.length,
        errors: 0,
      };
      try {
        const usageResult = await client.postUsage(usage);
        result.usageUpserted = usageResult.upserted;
        progress.processed = usage.length;
        onProgress?.(progress);
      } catch (error) {
        result.errors.push(`Usage sync failed: ${(error as Error).message}`);
        progress.errors++;
        onProgress?.(progress);
      }
    }
  }

  // Pairs sync
  if (!options.itemsOnly) {
    const pairs = await aggregator.aggregatePairs();

    if (!options.dryRun) {
      const progress: SyncProgress = {
        phase: 'pairs',
        processed: 0,
        total: pairs.length,
        errors: 0,
      };
      try {
        const pairsResult = await client.postPairs(pairs);
        result.pairsUpserted = pairsResult.upserted;
        progress.processed = pairs.length;
        onProgress?.(progress);
      } catch (error) {
        result.errors.push(`Pairs sync failed: ${(error as Error).message}`);
        progress.errors++;
        onProgress?.(progress);
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
