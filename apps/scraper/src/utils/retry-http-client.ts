import type { HttpClient } from './http-client';

/**
 * デフォルトの最大リトライ回数
 */
const DEFAULT_MAX_RETRIES = 3;

/**
 * デフォルトのリトライ待機時間（ミリ秒）
 * 429エラー時のクールダウンを考慮
 */
const DEFAULT_RETRY_DELAY_MS = 60000;

/**
 * リトライ対象のHTTPステータスコード
 * - 429: Too Many Requests
 * - 503: Service Unavailable
 * - 0: ネットワークエラー
 */
const DEFAULT_RETRYABLE_STATUS_CODES = [429, 503, 0] as const;

/**
 * リトライ設定
 */
export interface RetryConfig {
  /** 最大リトライ回数 */
  maxRetries: number;
  /** リトライ間の待機時間（ミリ秒） */
  retryDelayMs: number;
  /** リトライ対象のステータスコード（0はネットワークエラー） */
  retryableStatusCodes: number[];
}

/**
 * デフォルトのリトライ設定
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: DEFAULT_MAX_RETRIES,
  retryDelayMs: DEFAULT_RETRY_DELAY_MS,
  retryableStatusCodes: [...DEFAULT_RETRYABLE_STATUS_CODES],
};

/**
 * 指定ミリ秒待機
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * リトライ機能付きHTTPクライアントを作成
 * 既存のHttpClientをラップし、429/503/ネットワークエラー時にリトライする
 */
export function createRetryHttpClient(
  baseClient: HttpClient,
  config?: Partial<RetryConfig>,
): HttpClient {
  const finalConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  return {
    async fetchWithRateLimit(url: string) {
      let attempt = 0;
      let lastResult = await baseClient.fetchWithRateLimit(url);

      while (attempt < finalConfig.maxRetries - 1) {
        // 成功またはリトライ不要なエラーの場合は即座に返す
        if (
          lastResult.success ||
          !finalConfig.retryableStatusCodes.includes(lastResult.statusCode)
        ) {
          return lastResult;
        }

        // リトライ対象エラーの場合は待機してリトライ
        attempt++;
        console.log(
          `[RetryHttpClient] Retry ${attempt}/${finalConfig.maxRetries - 1} after ${finalConfig.retryDelayMs}ms (status: ${lastResult.statusCode})`,
        );
        await sleep(finalConfig.retryDelayMs);
        lastResult = await baseClient.fetchWithRateLimit(url);
      }

      return lastResult;
    },
  };
}
