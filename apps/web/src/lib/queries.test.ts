import { describe, expect, it } from 'vitest';
import { escapeLikePattern } from './queries';

describe('escapeLikePattern', () => {
  it('通常の文字列はそのまま返す', () => {
    expect(escapeLikePattern('hello')).toBe('hello');
    expect(escapeLikePattern('ミラプリ')).toBe('ミラプリ');
    expect(escapeLikePattern('')).toBe('');
  });

  it('% をエスケープする', () => {
    expect(escapeLikePattern('%')).toBe('\\%');
    expect(escapeLikePattern('100%')).toBe('100\\%');
  });

  it('_ をエスケープする', () => {
    expect(escapeLikePattern('_')).toBe('\\_');
    expect(escapeLikePattern('item_name')).toBe('item\\_name');
  });

  it('\\ をエスケープする', () => {
    expect(escapeLikePattern('\\')).toBe('\\\\');
  });

  it('複合ケース: 複数の特殊文字を含む文字列', () => {
    expect(escapeLikePattern('100%_test\\')).toBe('100\\%\\_test\\\\');
  });

  it('特殊文字を含まない日本語はそのまま返す', () => {
    expect(escapeLikePattern('レインボーマント')).toBe('レインボーマント');
  });
});
