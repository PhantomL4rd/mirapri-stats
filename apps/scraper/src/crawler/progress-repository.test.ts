import { describe, expect, it, vi } from 'vitest';
import { createProgressRepository, type ProgressData, type ProgressRepository } from './progress-repository';

// 進捗リポジトリのインメモリ実装（テスト用）
function createInMemoryProgressRepository(): ProgressRepository & { _data: Map<string, ProgressData> } {
  const data = new Map<string, ProgressData>();

  return {
    _data: data,

    async load(crawlerName: string): Promise<ProgressData | null> {
      return data.get(crawlerName) ?? null;
    },

    async save(saveData: { crawlerName: string; lastCompletedIndex: number; totalKeys: number; processedCharacters: number }): Promise<void> {
      const existing = data.get(saveData.crawlerName);
      data.set(saveData.crawlerName, {
        id: existing?.id ?? 'test-id',
        crawlerName: saveData.crawlerName,
        lastCompletedIndex: saveData.lastCompletedIndex,
        totalKeys: saveData.totalKeys,
        processedCharacters: saveData.processedCharacters,
        updatedAt: new Date(),
      });
    },
  };
}

describe('progress-repository (インターフェーステスト)', () => {
  describe('load', () => {
    it('進捗が存在しない場合はnullを返す', async () => {
      const repo = createInMemoryProgressRepository();

      const result = await repo.load('test-crawler');

      expect(result).toBeNull();
    });

    it('進捗が存在する場合はデータを返す', async () => {
      const repo = createInMemoryProgressRepository();
      repo._data.set('test-crawler', {
        id: '123',
        crawlerName: 'test-crawler',
        lastCompletedIndex: 10,
        totalKeys: 100,
        processedCharacters: 50,
        updatedAt: new Date(),
      });

      const result = await repo.load('test-crawler');

      expect(result).not.toBeNull();
      expect(result?.crawlerName).toBe('test-crawler');
      expect(result?.lastCompletedIndex).toBe(10);
    });
  });

  describe('save', () => {
    it('新規進捗を保存する', async () => {
      const repo = createInMemoryProgressRepository();

      await repo.save({
        crawlerName: 'test-crawler',
        lastCompletedIndex: 10,
        totalKeys: 100,
        processedCharacters: 50,
      });

      const saved = repo._data.get('test-crawler');
      expect(saved).not.toBeUndefined();
      expect(saved?.lastCompletedIndex).toBe(10);
    });

    it('既存進捗を更新する（UPSERT）', async () => {
      const repo = createInMemoryProgressRepository();

      // 最初の保存
      await repo.save({
        crawlerName: 'test-crawler',
        lastCompletedIndex: 10,
        totalKeys: 100,
        processedCharacters: 50,
      });

      // 更新
      await repo.save({
        crawlerName: 'test-crawler',
        lastCompletedIndex: 20,
        totalKeys: 100,
        processedCharacters: 100,
      });

      const saved = repo._data.get('test-crawler');
      expect(saved?.lastCompletedIndex).toBe(20);
      expect(saved?.processedCharacters).toBe(100);
    });
  });
});
