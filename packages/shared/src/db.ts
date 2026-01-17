import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

/**
 * データベース接続を作成
 * @param connectionString PostgreSQL接続文字列
 * @returns Drizzle ORM インスタンス
 */
export function createDb(connectionString: string) {
  const client = postgres(connectionString, {
    connect_timeout: 30, // 30秒でタイムアウト
    idle_timeout: 20,
    max_lifetime: 60 * 30, // 30分
  });
  return drizzle(client, { schema });
}

/** データベースインスタンスの型 */
export type Database = ReturnType<typeof createDb>;
