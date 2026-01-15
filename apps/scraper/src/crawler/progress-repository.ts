import { eq } from 'drizzle-orm';
import type { Database } from '@mirapuri/shared/db';
import { crawlProgress } from '@mirapuri/shared';

/**
 * 進捗データ
 */
export interface ProgressData {
  id: string;
  crawlerName: string;
  lastCompletedIndex: number;
  totalKeys: number;
  processedCharacters: number;
  updatedAt: Date;
}

/**
 * 進捗保存用データ（idとupdatedAtは自動生成）
 */
export interface ProgressSaveData {
  crawlerName: string;
  lastCompletedIndex: number;
  totalKeys: number;
  processedCharacters: number;
}

/**
 * 進捗リポジトリインターフェース
 */
export interface ProgressRepository {
  /** 進捗を読み込み（存在しない場合はnull） */
  load(crawlerName: string): Promise<ProgressData | null>;
  /** 進捗を保存（UPSERT） */
  save(data: ProgressSaveData): Promise<void>;
}

/**
 * 進捗リポジトリを作成
 */
export function createProgressRepository(db: Database): ProgressRepository {
  return {
    async load(crawlerName: string): Promise<ProgressData | null> {
      const rows = await db
        .select()
        .from(crawlProgress)
        .where(eq(crawlProgress.crawlerName, crawlerName));

      if (rows.length === 0) {
        return null;
      }

      return rows[0] ?? null;
    },

    async save(data: ProgressSaveData): Promise<void> {
      await db
        .insert(crawlProgress)
        .values({
          crawlerName: data.crawlerName,
          lastCompletedIndex: data.lastCompletedIndex,
          totalKeys: data.totalKeys,
          processedCharacters: data.processedCharacters,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: crawlProgress.crawlerName,
          set: {
            lastCompletedIndex: data.lastCompletedIndex,
            totalKeys: data.totalKeys,
            processedCharacters: data.processedCharacters,
            updatedAt: new Date(),
          },
        });
    },
  };
}
