import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger, logger } from './logger.js';

describe('Logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('info', () => {
    it('should output JSON with level "info"', () => {
      logger.info('テストメッセージ');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string);
      expect(output.level).toBe('info');
      expect(output.message).toBe('テストメッセージ');
      expect(output.timestamp).toBeDefined();
    });

    it('should include context when provided', () => {
      logger.info('処理開始', { characterId: '12345' });

      const output = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string);
      expect(output.context).toEqual({ characterId: '12345' });
    });
  });

  describe('warn', () => {
    it('should output JSON with level "warn"', () => {
      logger.warn('警告メッセージ');

      const output = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string);
      expect(output.level).toBe('warn');
      expect(output.message).toBe('警告メッセージ');
    });
  });

  describe('error', () => {
    it('should output JSON with level "error"', () => {
      logger.error('エラーメッセージ', { statusCode: 500 });

      const output = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string);
      expect(output.level).toBe('error');
      expect(output.message).toBe('エラーメッセージ');
      expect(output.context).toEqual({ statusCode: 500 });
    });
  });

  describe('createLogger', () => {
    it('should create logger with custom prefix', () => {
      const customLogger = createLogger('Scraper');
      customLogger.info('カスタムログ');

      const output = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string);
      expect(output.prefix).toBe('Scraper');
    });
  });
});
