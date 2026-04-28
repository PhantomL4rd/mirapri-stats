import { describe, expect, it } from 'vitest';
import { buildStainsFromDyesJson, loadJaNames } from './dye-master-sync.js';

describe('loadJaNames', () => {
  it('apps/sync/data/dye-names-ja.json をロードして 100件以上の names を返す', () => {
    const names = loadJaNames();
    expect(Object.keys(names).length).toBeGreaterThan(100);
    expect(names['dye_002']).toBe('スノウホワイト');
  });
});

describe('buildStainsFromDyesJson', () => {
  it('dye_id を JP名でマージし、JP名 PK の StainInfo を返す', () => {
    const entries = [
      {
        id: 'dye_002',
        name: 'Snow White',
        category: 'white',
        rgb: { r: 228, g: 223, b: 208 },
      },
    ];
    const jaNames = { dye_002: 'スノウホワイト' };
    const result = buildStainsFromDyesJson(entries, jaNames);
    expect(result).toEqual([
      {
        name: 'スノウホワイト',
        dyeId: 'dye_002',
        category: 'white',
        r: 228,
        g: 223,
        b: 208,
      },
    ]);
  });

  it('JP名が無い dye はスキップする', () => {
    const entries = [
      { id: 'dye_unknown', name: 'X', rgb: { r: 0, g: 0, b: 0 } },
      { id: 'dye_002', name: 'Snow White', rgb: { r: 228, g: 223, b: 208 } },
    ];
    const result = buildStainsFromDyesJson(entries, { dye_002: 'スノウホワイト' });
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('スノウホワイト');
  });

  it('rgb が無いエントリはスキップする', () => {
    const result = buildStainsFromDyesJson(
      [
        {
          id: 'dye_002',
          name: 'X',
          rgb: undefined as unknown as { r: number; g: number; b: number },
        },
      ],
      { dye_002: 'スノウホワイト' },
    );
    expect(result).toEqual([]);
  });

  it('category が無い場合は null', () => {
    const result = buildStainsFromDyesJson(
      [{ id: 'dye_002', name: 'X', rgb: { r: 0, g: 0, b: 0 } }],
      { dye_002: 'スノウホワイト' },
    );
    expect(result[0]?.category).toBeNull();
  });
});
