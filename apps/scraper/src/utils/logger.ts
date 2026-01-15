/**
 * ログレベル
 */
type LogLevel = 'info' | 'warn' | 'error';

/**
 * ログエントリの構造
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  prefix?: string;
  context?: Record<string, unknown>;
}

/**
 * ロガーインターフェース
 */
export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

/**
 * 構造化ログを出力
 */
function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  prefix?: string,
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (prefix) {
    entry.prefix = prefix;
  }

  if (context) {
    entry.context = context;
  }

  console.log(JSON.stringify(entry));
}

/**
 * プレフィックス付きロガーを作成
 * @param prefix ログプレフィックス（モジュール名など）
 */
export function createLogger(prefix: string): Logger {
  return {
    info: (message, context) => log('info', message, context, prefix),
    warn: (message, context) => log('warn', message, context, prefix),
    error: (message, context) => log('error', message, context, prefix),
  };
}

/**
 * デフォルトロガー
 */
export const logger: Logger = {
  info: (message, context) => log('info', message, context),
  warn: (message, context) => log('warn', message, context),
  error: (message, context) => log('error', message, context),
};
