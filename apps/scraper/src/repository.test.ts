import type { GlamourData, GlamourSlot } from '@mirapri/shared';
import type { Database } from '@mirapri/shared/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRepository, type GlamourRepository } from './repository.js';

/** stain フィールドのデフォルトを補ったヘルパー（既存テストの可読性維持用） */
const g = (
  slot: GlamourSlot,
  itemId: string | null,
  itemName: string | null,
  stains: Partial<Pick<GlamourData, 'stain1Name' | 'stain2Name'>> = {},
): GlamourData => ({
  slot,
  itemId,
  itemName,
  stain1Name: stains.stain1Name ?? null,
  stain2Name: stains.stain2Name ?? null,
});

// Mock database
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockOnConflictDoNothing = vi.fn();

const createMockDb = () => {
  mockOnConflictDoNothing.mockResolvedValue(undefined);
  // values() は Promise を返すか、onConflictDoNothing チェーンをサポート
  mockValues.mockImplementation(() => {
    const result = Promise.resolve(undefined) as Promise<undefined> & {
      onConflictDoNothing: typeof mockOnConflictDoNothing;
    };
    // onConflictDoNothing をチェーン可能にする
    result.onConflictDoNothing = mockOnConflictDoNothing;
    return result;
  });
  mockInsert.mockReturnValue({ values: mockValues });
  return {
    insert: mockInsert,
  } as unknown as Database;
};

describe('repository', () => {
  let mockDb: Database;
  let repository: GlamourRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnConflictDoNothing.mockResolvedValue(undefined);
    mockDb = createMockDb();
    repository = createRepository(mockDb);
  });

  describe('saveGlamourData', () => {
    it('空配列の場合は0件で成功を返す', async () => {
      const result = await repository.saveGlamourData('12345678', []);

      expect(result.success).toBe(true);
      expect(result.insertedCount).toBe(0);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('ミラプリデータを正しくINSERTする', async () => {
      const glamourData: GlamourData[] = [
        g('head', 'abc123', '頭装備'),
        g('body', 'def456', '胴装備'),
      ];

      const result = await repository.saveGlamourData('12345678', glamourData);

      expect(result.success).toBe(true);
      expect(result.insertedCount).toBe(2);
      // charactersGlamour と itemsCache の2回呼ばれる
      expect(mockInsert).toHaveBeenCalledTimes(2);
      // 最初の呼び出しは charactersGlamour
      expect(mockValues).toHaveBeenNthCalledWith(1, [
        {
          characterId: '12345678',
          slotId: 1,
          itemId: 'abc123',
          stain1Name: null,
          stain2Name: null,
        },
        {
          characterId: '12345678',
          slotId: 2,
          itemId: 'def456',
          stain1Name: null,
          stain2Name: null,
        },
      ]);
    });

    it('スロット名からスロットIDへ正しく変換する', async () => {
      const glamourData: GlamourData[] = [
        g('head', 'item1', '頭装備'),
        g('body', 'item2', '胴装備'),
        g('hands', 'item3', '手装備'),
        g('legs', 'item4', '脚装備'),
        g('feet', 'item5', '足装備'),
      ];

      await repository.saveGlamourData('12345678', glamourData);

      expect(mockValues).toHaveBeenCalledWith([
        { characterId: '12345678', slotId: 1, itemId: 'item1', stain1Name: null, stain2Name: null },
        { characterId: '12345678', slotId: 2, itemId: 'item2', stain1Name: null, stain2Name: null },
        { characterId: '12345678', slotId: 3, itemId: 'item3', stain1Name: null, stain2Name: null },
        { characterId: '12345678', slotId: 4, itemId: 'item4', stain1Name: null, stain2Name: null },
        { characterId: '12345678', slotId: 5, itemId: 'item5', stain1Name: null, stain2Name: null },
      ]);
    });

    it('itemIdがnullのデータはスキップする', async () => {
      const glamourData: GlamourData[] = [
        g('head', 'abc123', '頭装備'),
        g('body', null, null),
        g('hands', 'ghi789', '手装備'),
      ];

      const result = await repository.saveGlamourData('12345678', glamourData);

      expect(result.success).toBe(true);
      expect(result.insertedCount).toBe(2);
      expect(mockValues).toHaveBeenCalledWith([
        {
          characterId: '12345678',
          slotId: 1,
          itemId: 'abc123',
          stain1Name: null,
          stain2Name: null,
        },
        {
          characterId: '12345678',
          slotId: 3,
          itemId: 'ghi789',
          stain1Name: null,
          stain2Name: null,
        },
      ]);
    });

    it('全てnullの場合は0件で成功を返す', async () => {
      const glamourData: GlamourData[] = [g('head', null, null), g('body', null, null)];

      const result = await repository.saveGlamourData('12345678', glamourData);

      expect(result.success).toBe(true);
      expect(result.insertedCount).toBe(0);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('stain名を含めて保存する（stains_cache は廃止）', async () => {
      const glamourData: GlamourData[] = [
        g('head', 'abc', '頭', { stain1Name: '赤', stain2Name: '白' }),
        g('body', 'def', '胴', { stain2Name: '青' }),
      ];

      await repository.saveGlamourData('12345678', glamourData);

      expect(mockValues).toHaveBeenNthCalledWith(1, [
        {
          characterId: '12345678',
          slotId: 1,
          itemId: 'abc',
          stain1Name: '赤',
          stain2Name: '白',
        },
        {
          characterId: '12345678',
          slotId: 2,
          itemId: 'def',
          stain1Name: null,
          stain2Name: '青',
        },
      ]);
      // 2回目: itemsCache のみ（stains_cache 呼び出し無し）
      expect(mockValues).toHaveBeenCalledTimes(2);
    });

    it('データベースエラー時はエラー結果を返す', async () => {
      const glamourData: GlamourData[] = [g('head', 'abc123', '頭装備')];

      mockValues.mockRejectedValue(new Error('Connection refused'));

      const result = await repository.saveGlamourData('12345678', glamourData);

      expect(result.success).toBe(false);
      expect(result.insertedCount).toBe(0);
      expect(result.error).toBe('Connection refused');
    });
  });
});
