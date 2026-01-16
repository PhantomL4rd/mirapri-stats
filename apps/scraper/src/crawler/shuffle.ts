/**
 * シード付きシャッフルユーティリティ
 * Fisher-Yates アルゴリズムによる再現可能なシャッフル
 */

/** デフォルトシード値 */
export const DEFAULT_SEED = 42;

/**
 * シード付き疑似乱数生成器を作成
 * Mulberry32 アルゴリズムを使用（シンプルで高速）
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates シャッフル（シード付き）
 * 配列をインプレースでシャッフルし、同じ配列を返す
 */
export function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const rng = createSeededRandom(seed);

  // Fisher-Yates shuffle
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j]!, array[i]!];
  }

  return array;
}
