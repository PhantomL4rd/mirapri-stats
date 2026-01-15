import type { Scraper } from '../scraper';
import type { CharacterListFetcher } from './character-list-fetcher';
import type { ProgressRepository } from './progress-repository';
import type { SearchKeyGenerator } from './search-key-generator';

/**
 * クローラー設定
 */
export interface CrawlerConfig {
  crawlerName: string;
  dryRun: boolean;
}

/**
 * クローラー統計
 */
export interface CrawlerStats {
  processedKeys: number;
  totalKeys: number;
  processedCharacters: number;
  skippedCharacters: number;
  errors: number;
}

/**
 * クローラー依存関係
 */
export interface CrawlerDependencies {
  keyGenerator: SearchKeyGenerator;
  listFetcher: CharacterListFetcher;
  progress: ProgressRepository;
  scraper: Scraper;
  /** キャラクターが既にDBに存在するかチェック */
  characterExists: (characterId: string) => Promise<boolean>;
}

/**
 * クローラーインターフェース
 */
export interface Crawler {
  start(): Promise<CrawlerStats>;
  getStats(): CrawlerStats;
}

/**
 * クローラーを作成
 */
export function createCrawler(config: CrawlerConfig, deps: CrawlerDependencies): Crawler {
  const { crawlerName, dryRun } = config;
  const { keyGenerator, listFetcher, progress, scraper, characterExists } = deps;

  const stats: CrawlerStats = {
    processedKeys: 0,
    totalKeys: 0,
    processedCharacters: 0,
    skippedCharacters: 0,
    errors: 0,
  };

  return {
    async start(): Promise<CrawlerStats> {
      const keys = keyGenerator.generateAll();
      stats.totalKeys = keys.length;

      console.log(`[Crawler] Starting crawler: ${crawlerName}`);
      console.log(`[Crawler] Total keys: ${stats.totalKeys}`);

      if (dryRun) {
        console.log('[Crawler] Dry run mode - printing keys and exiting');
        for (const key of keys) {
          console.log(
            `  [${key.index}] ${key.worldname} / job:${key.classjob} / ${key.raceTribe} / gc:${key.gcid}`,
          );
        }
        return stats;
      }

      // 進捗を読み込み、再開位置を決定
      const existingProgress = await progress.load(crawlerName);
      const startIndex = existingProgress ? existingProgress.lastCompletedIndex + 1 : 0;

      if (existingProgress) {
        console.log(`[Crawler] Resuming from index ${startIndex}`);
        stats.processedCharacters = existingProgress.processedCharacters;
      }

      // 各キーを順次処理
      for (const key of keys) {
        if (key.index < startIndex) {
          continue;
        }

        console.log(
          `[Crawler] Processing key ${key.index + 1}/${stats.totalKeys}: ${key.worldname} / job:${key.classjob} / ${key.raceTribe} / gc:${key.gcid}`,
        );

        // キャラクター一覧を取得
        const characterIds = await listFetcher.fetchAllCharacterIds(key);
        console.log(`[Crawler] Found ${characterIds.length} characters`);

        // 各キャラクターを処理
        for (const characterId of characterIds) {
          // 既存チェック
          const exists = await characterExists(characterId);
          if (exists) {
            console.log(`[Crawler] Skipping existing character: ${characterId}`);
            stats.skippedCharacters++;
            continue;
          }

          // スクレイプ実行
          const result = await scraper.scrape(characterId);

          if (result.success) {
            if (result.savedCount > 0) {
              stats.processedCharacters++;
              console.log(
                `[Crawler] Scraped character ${characterId}: ${result.savedCount} items saved`,
              );
            } else {
              // ミラプリ0件はスキップ扱い
              stats.skippedCharacters++;
              console.log(`[Crawler] Skipping character ${characterId}: no glamour data`);
            }
          } else {
            stats.errors++;
            console.log(
              `[Crawler] Error scraping character ${characterId}: ${result.errors.map((e) => e.message).join(', ')}`,
            );
          }
        }

        // キー完了後に進捗を保存
        stats.processedKeys++;
        await progress.save({
          crawlerName,
          lastCompletedIndex: key.index,
          totalKeys: stats.totalKeys,
          processedCharacters: stats.processedCharacters,
        });

        console.log(
          `[Crawler] Key ${key.index + 1}/${stats.totalKeys} completed. Processed: ${stats.processedCharacters}, Skipped: ${stats.skippedCharacters}, Errors: ${stats.errors}`,
        );
      }

      console.log('[Crawler] Crawl completed');
      console.log(
        `[Crawler] Final stats: Keys=${stats.processedKeys}/${stats.totalKeys}, Characters=${stats.processedCharacters}, Skipped=${stats.skippedCharacters}, Errors=${stats.errors}`,
      );

      return stats;
    },

    getStats(): CrawlerStats {
      return { ...stats };
    },
  };
}
