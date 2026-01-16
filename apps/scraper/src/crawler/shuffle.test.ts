import { describe, expect, it } from 'vitest';
import { createSeededRandom, DEFAULT_SEED, shuffleWithSeed } from './shuffle';

describe('shuffle', () => {
  describe('createSeededRandom', () => {
    it('同じシードで同じ乱数列を生成する', () => {
      const rng1 = createSeededRandom(42);
      const rng2 = createSeededRandom(42);

      const values1 = Array.from({ length: 10 }, () => rng1());
      const values2 = Array.from({ length: 10 }, () => rng2());

      expect(values1).toEqual(values2);
    });

    it('異なるシードで異なる乱数列を生成する', () => {
      const rng1 = createSeededRandom(42);
      const rng2 = createSeededRandom(123);

      const values1 = Array.from({ length: 10 }, () => rng1());
      const values2 = Array.from({ length: 10 }, () => rng2());

      expect(values1).not.toEqual(values2);
    });

    it('0から1の範囲の値を生成する', () => {
      const rng = createSeededRandom(42);

      for (let i = 0; i < 100; i++) {
        const value = rng();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });
  });

  describe('shuffleWithSeed', () => {
    it('配列をシャッフルする', () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled = shuffleWithSeed([...original], 42);

      // 順序が変わっている
      expect(shuffled).not.toEqual(original);
      // 全要素が保持されている
      expect(shuffled.sort((a, b) => a - b)).toEqual(original);
    });

    it('同じシードで同じ順序にシャッフルされる', () => {
      const arr1 = [1, 2, 3, 4, 5];
      const arr2 = [1, 2, 3, 4, 5];

      const shuffled1 = shuffleWithSeed(arr1, 42);
      const shuffled2 = shuffleWithSeed(arr2, 42);

      expect(shuffled1).toEqual(shuffled2);
    });

    it('異なるシードで異なる順序にシャッフルされる', () => {
      const arr1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const arr2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const shuffled1 = shuffleWithSeed(arr1, 42);
      const shuffled2 = shuffleWithSeed(arr2, 123);

      expect(shuffled1).not.toEqual(shuffled2);
    });

    it('空配列をシャッフルしても空配列', () => {
      const empty: number[] = [];
      const shuffled = shuffleWithSeed(empty, 42);
      expect(shuffled).toEqual([]);
    });

    it('1要素の配列をシャッフルしても同じ', () => {
      const single = [1];
      const shuffled = shuffleWithSeed(single, 42);
      expect(shuffled).toEqual([1]);
    });

    it('インプレースで変更し、同じ配列を返す', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = shuffleWithSeed(arr, 42);
      expect(result).toBe(arr);
    });
  });

  describe('DEFAULT_SEED', () => {
    it('デフォルトシードは42', () => {
      expect(DEFAULT_SEED).toBe(42);
    });
  });
});
