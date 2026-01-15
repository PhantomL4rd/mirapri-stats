#!/usr/bin/env node
import 'dotenv/config';
import { createDb } from '@mirapuri/shared/db';
import { createHttpClient } from './utils/http-client';
import { createRepository } from './repository';
import { createScraper } from './scraper';
import {
  createCrawler,
  createCharacterListFetcher,
  createRetryHttpClient,
  createSearchKeyGenerator,
} from './crawler';

/**
 * CLIエントリーポイント
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  // 環境変数チェック
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl && !dryRun) {
    console.error('Error: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('=== Character List Crawler ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);

  // コンポーネント初期化
  const keyGenerator = createSearchKeyGenerator();

  if (dryRun) {
    // dryRunモードはDB接続不要（進捗読み書きをスキップするため）
    const crawler = createCrawler(
      { crawlerName: 'tiamat-crawler', dryRun: true },
      {
        db: null as never, // dryRunでは使用しない
        keyGenerator,
        listFetcher: { fetchAllCharacterIds: async () => [] },
        scraper: { scrape: async () => ({ success: true, characterId: '', savedCount: 0, errors: [] }) },
        characterExists: async () => false,
      },
    );

    await crawler.start();
    console.log('\nDry run completed.');
    return;
  }

  // DB接続
  const db = createDb(databaseUrl!);

  // HTTPクライアント（リトライ機能付き）
  const baseHttpClient = createHttpClient();
  const httpClient = createRetryHttpClient(baseHttpClient);

  // リポジトリ
  const glamourRepo = createRepository(db);

  // フェッチャー・スクレイパー
  const listFetcher = createCharacterListFetcher(httpClient);
  const scraper = createScraper({ httpClient, repository: glamourRepo });

  // クローラー
  const crawler = createCrawler(
    { crawlerName: 'tiamat-crawler', dryRun: false },
    {
      db,
      keyGenerator,
      listFetcher,
      scraper,
      characterExists: (id) => glamourRepo.characterExists(id),
    },
  );

  try {
    const stats = await crawler.start();

    console.log('\n=== Crawl Summary ===');
    console.log(`Keys processed: ${stats.processedKeys}/${stats.totalKeys}`);
    console.log(`Characters processed: ${stats.processedCharacters}`);
    console.log(`Characters skipped: ${stats.skippedCharacters}`);
    console.log(`Errors: ${stats.errors}`);
  } finally {
    // db.$client で postgres クライアントにアクセス可能
    await db.$client.end();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
