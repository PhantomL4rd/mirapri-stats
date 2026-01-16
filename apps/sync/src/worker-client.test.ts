import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AggregatedPair, AggregatedUsage, ExtractedItem } from './types.js';
import { createWorkerClient, type WorkerClient } from './worker-client.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const createMockResponse = (
  status: number,
  body: unknown = {},
  ok: boolean = status >= 200 && status < 300,
): Response =>
  ({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as Response;

describe('WorkerClient', () => {
  let client: WorkerClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createWorkerClient({
      baseUrl: 'https://api.example.com',
      authToken: 'test-token',
    });
  });

  describe('postItems', () => {
    it('正常にアイテムをPOSTする', async () => {
      mockFetch.mockResolvedValue(createMockResponse(200, { inserted: 3, skipped: 0 }));

      const items: ExtractedItem[] = [
        { id: 'item1', name: 'Name1', slotId: 1 },
        { id: 'item2', name: 'Name2', slotId: 2 },
        { id: 'item3', name: 'Name3', slotId: 3 },
      ];

      const result = await client.postItems(items);

      expect(result).toEqual({ inserted: 3, skipped: 0 });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/items',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('500件を超えるアイテムはチャンク分割される', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse(200, { inserted: 500, skipped: 0 }))
        .mockResolvedValueOnce(createMockResponse(200, { inserted: 100, skipped: 0 }));

      const items: ExtractedItem[] = Array.from({ length: 600 }, (_, i) => ({
        id: `item${i}`,
        name: `Name${i}`,
        slotId: 1,
      }));

      const result = await client.postItems(items);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ inserted: 600, skipped: 0 });
    });

    it('カスタムチャンクサイズを設定できる', async () => {
      const customClient = createWorkerClient({
        baseUrl: 'https://api.example.com',
        authToken: 'test-token',
        chunkSizes: { items: 100 },
      });

      mockFetch
        .mockResolvedValueOnce(createMockResponse(200, { inserted: 100, skipped: 0 }))
        .mockResolvedValueOnce(createMockResponse(200, { inserted: 50, skipped: 0 }));

      const items: ExtractedItem[] = Array.from({ length: 150 }, (_, i) => ({
        id: `item${i}`,
        name: `Name${i}`,
        slotId: 1,
      }));

      await customClient.postItems(items);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('postUsage', () => {
    it('正常に使用データをPOSTする', async () => {
      mockFetch.mockResolvedValue(createMockResponse(200, { upserted: 3 }));

      const usage: AggregatedUsage[] = [
        { itemId: 'item1', usageCount: 100 },
        { itemId: 'item2', usageCount: 50 },
        { itemId: 'item3', usageCount: 25 },
      ];

      const result = await client.postUsage(usage);

      expect(result).toEqual({ upserted: 3 });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/usage',
        expect.anything(),
      );
    });

    it('1000件を超えるデータはチャンク分割される', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse(200, { upserted: 1000 }))
        .mockResolvedValueOnce(createMockResponse(200, { upserted: 500 }));

      const usage: AggregatedUsage[] = Array.from({ length: 1500 }, (_, i) => ({
        itemId: `item${i}`,
        usageCount: i,
      }));

      const result = await client.postUsage(usage);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ upserted: 1500 });
    });
  });

  describe('postPairs', () => {
    it('正常にペアデータをPOSTする', async () => {
      mockFetch.mockResolvedValue(createMockResponse(200, { upserted: 2 }));

      const pairs: AggregatedPair[] = [
        { slotPair: 'head-body', itemIdA: 'item1', itemIdB: 'item2', pairCount: 10, rank: 1 },
        { slotPair: 'body-hands', itemIdA: 'item3', itemIdB: 'item4', pairCount: 5, rank: 1 },
      ];

      const result = await client.postPairs(pairs);

      expect(result).toEqual({ upserted: 2 });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/pairs',
        expect.anything(),
      );
    });

    it('1000件を超えるデータはチャンク分割される', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse(200, { upserted: 1000 }))
        .mockResolvedValueOnce(createMockResponse(200, { upserted: 200 }));

      const pairs: AggregatedPair[] = Array.from({ length: 1200 }, (_, i) => ({
        slotPair: 'head-body' as const,
        itemIdA: `itemA${i}`,
        itemIdB: `itemB${i}`,
        pairCount: i,
        rank: (i % 10) + 1,
      }));

      const result = await client.postPairs(pairs);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ upserted: 1200 });
    });
  });

  describe('リトライロジック', () => {
    it('5xxエラーはリトライする', async () => {
      const clientWithNoDelay = createWorkerClient({
        baseUrl: 'https://api.example.com',
        authToken: 'test-token',
      });

      mockFetch
        .mockResolvedValueOnce(createMockResponse(500, { error: 'Server Error' }, false))
        .mockResolvedValueOnce(createMockResponse(200, { inserted: 1, skipped: 0 }));

      const items: ExtractedItem[] = [{ id: 'item1', name: 'Name1', slotId: 1 }];

      const result = await clientWithNoDelay.postItems(items);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ inserted: 1, skipped: 0 });
    }, 10000);

    it('401エラーは即座にエラーを投げる（リトライしない）', async () => {
      mockFetch.mockResolvedValue(createMockResponse(401, { error: 'Unauthorized' }, false));

      const items: ExtractedItem[] = [{ id: 'item1', name: 'Name1', slotId: 1 }];

      await expect(client.postItems(items)).rejects.toThrow('Unauthorized: Invalid AUTH_TOKEN');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('リトライ回数を超えると失敗する', async () => {
      const clientWith2Retries = createWorkerClient({
        baseUrl: 'https://api.example.com',
        authToken: 'test-token',
        retryCount: 2,
      });

      mockFetch.mockResolvedValue(createMockResponse(500, { error: 'Server Error' }, false));

      const items: ExtractedItem[] = [{ id: 'item1', name: 'Name1', slotId: 1 }];

      await expect(clientWith2Retries.postItems(items)).rejects.toThrow('Server error: 500');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, 10000);
  });

  describe('エラーハンドリング', () => {
    it('400エラーはエラーメッセージを含む', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse(400, { error: 'Invalid request body' }, false),
      );

      const items: ExtractedItem[] = [{ id: 'item1', name: 'Name1', slotId: 1 }];

      await expect(client.postItems(items)).rejects.toThrow('Failed to post items: 400');
    });
  });

  describe('空配列の処理', () => {
    it('空のアイテム配列は0件で返す', async () => {
      const result = await client.postItems([]);

      expect(result).toEqual({ inserted: 0, skipped: 0 });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('空の使用データ配列は0件で返す', async () => {
      const result = await client.postUsage([]);

      expect(result).toEqual({ upserted: 0 });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('空のペア配列は0件で返す', async () => {
      const result = await client.postPairs([]);

      expect(result).toEqual({ upserted: 0 });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
