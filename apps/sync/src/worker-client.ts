import type {
  AggregatedPair,
  AggregatedUsage,
  ExtractedItem,
  WorkerClientConfig,
  WorkerResponse,
} from './types.js';

/**
 * バッチサイズ（件数）
 * Worker APIへの1リクエストあたりの最大件数
 */
const DEFAULT_ITEMS_CHUNK_SIZE = 500;
const DEFAULT_USAGE_CHUNK_SIZE = 1000;
const DEFAULT_PAIRS_CHUNK_SIZE = 1000;

const DEFAULT_CHUNK_SIZES = {
  items: DEFAULT_ITEMS_CHUNK_SIZE,
  usage: DEFAULT_USAGE_CHUNK_SIZE,
  pairs: DEFAULT_PAIRS_CHUNK_SIZE,
};

/**
 * リトライ設定
 */
const DEFAULT_RETRY_COUNT = 3;

/**
 * リトライ間隔の基準値（ミリ秒）
 * Exponential backoffで使用（1000ms → 2000ms → 4000ms）
 */
const DEFAULT_RETRY_DELAY_MS = 1000;

export interface WorkerClient {
  /** sync セッション開始、新バージョンを返す */
  startSync(): Promise<{ version: string }>;
  /** sync コミット、active_version を切り替え */
  commitSync(version: string): Promise<void>;
  /** sync 中断、部分データを削除 */
  abortSync(version: string): Promise<void>;
  /** items 送信（バージョンなし、UPSERT） */
  postItems(items: ExtractedItem[]): Promise<{ inserted: number; skipped: number }>;
  /** usage 送信（バージョン付き、INSERT） */
  postUsage(version: string, usage: AggregatedUsage[]): Promise<{ inserted: number }>;
  /** pairs 送信（バージョン付き、INSERT） */
  postPairs(version: string, pairs: AggregatedPair[]): Promise<{ inserted: number }>;
}

/**
 * WorkerClient Factory
 */
export function createWorkerClient(config: WorkerClientConfig): WorkerClient {
  const chunkSizes = {
    ...DEFAULT_CHUNK_SIZES,
    ...config.chunkSizes,
  };
  const retryCount = config.retryCount ?? DEFAULT_RETRY_COUNT;

  async function fetchWithRetry(
    url: string,
    options: RequestInit,
    attempts: number = retryCount,
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let i = 0; i < attempts; i++) {
      try {
        const response = await fetch(url, options);

        if (response.status === 401) {
          throw new Error('Unauthorized: Invalid AUTH_TOKEN');
        }

        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        if ((error as Error).message.includes('Unauthorized')) {
          throw error; // 認証エラーは即座に終了
        }
        if (i < attempts - 1) {
          const delay = DEFAULT_RETRY_DELAY_MS * 2 ** i; // exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError ?? new Error('Request failed');
  }

  function chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  return {
    async startSync(): Promise<{ version: string }> {
      const response = await fetchWithRetry(`${config.baseUrl}/api/sync/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to start sync: ${response.status} - ${errorBody}`);
      }

      const result = (await response.json()) as { success: boolean; version: string };
      return { version: result.version };
    },

    async commitSync(version: string): Promise<void> {
      const response = await fetchWithRetry(`${config.baseUrl}/api/sync/commit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ version }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to commit sync: ${response.status} - ${errorBody}`);
      }
    },

    async abortSync(version: string): Promise<void> {
      const response = await fetchWithRetry(`${config.baseUrl}/api/sync/abort`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ version }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to abort sync: ${response.status} - ${errorBody}`);
      }
    },

    async postItems(items: ExtractedItem[]): Promise<{ inserted: number; skipped: number }> {
      const chunks = chunk(items, chunkSizes.items);
      let totalInserted = 0;
      let totalSkipped = 0;

      for (const batch of chunks) {
        const response = await fetchWithRetry(`${config.baseUrl}/api/items`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: batch.map((item) => ({
              id: item.id,
              name: item.name,
              slotId: item.slotId,
            })),
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Failed to post items: ${response.status} - ${errorBody}`);
        }

        const result = (await response.json()) as WorkerResponse;
        totalInserted += result.inserted ?? 0;
        totalSkipped += result.skipped ?? 0;
      }

      return { inserted: totalInserted, skipped: totalSkipped };
    },

    async postUsage(version: string, usage: AggregatedUsage[]): Promise<{ inserted: number }> {
      const chunks = chunk(usage, chunkSizes.usage);
      let totalInserted = 0;

      for (const batch of chunks) {
        const response = await fetchWithRetry(`${config.baseUrl}/api/usage?version=${version}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            usage: batch.map((item) => ({
              slotId: item.slotId,
              itemId: item.itemId,
              usageCount: item.usageCount,
            })),
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Failed to post usage: ${response.status} - ${errorBody}`);
        }

        const result = (await response.json()) as WorkerResponse;
        totalInserted += result.inserted ?? 0;
      }

      return { inserted: totalInserted };
    },

    async postPairs(version: string, pairs: AggregatedPair[]): Promise<{ inserted: number }> {
      const chunks = chunk(pairs, chunkSizes.pairs);
      let totalInserted = 0;

      for (const batch of chunks) {
        const response = await fetchWithRetry(`${config.baseUrl}/api/pairs?version=${version}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pairs: batch.map((item) => ({
              slotPair: item.slotPair,
              itemIdA: item.itemIdA,
              itemIdB: item.itemIdB,
              pairCount: item.pairCount,
              rank: item.rank,
            })),
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Failed to post pairs: ${response.status} - ${errorBody}`);
        }

        const result = (await response.json()) as WorkerResponse;
        totalInserted += result.inserted ?? 0;
      }

      return { inserted: totalInserted };
    },
  };
}
