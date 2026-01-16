import { parseCharacterListPage } from '../parsers/character-list';
import type { HttpClient } from '../utils/http-client';
import { buildSearchUrl, type SearchKey } from './search-key-generator';

/**
 * デフォルトの最低レベル閾値
 * FF14のレベルキャップ（カンスト）を基準に、アクティブプレイヤーを対象とする
 */
const DEFAULT_MIN_LEVEL = 100;

/**
 * キャラクター一覧取得設定
 */
export interface CharacterListFetcherConfig {
  /** 最低レベル（これ未満のキャラクターは除外し、出現時点で早期終了） */
  minLevel: number;
  /** ページ数の上限（セーフガード、無限ループ防止） */
  maxPages: number;
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: CharacterListFetcherConfig = {
  minLevel: DEFAULT_MIN_LEVEL,
  maxPages: 100, // セーフガード：通常の検索結果はこれ以下になるはず
};

/**
 * キャラクター一覧フェッチャーインターフェース
 */
export interface CharacterListFetcher {
  /**
   * 検索キーに基づいて全キャラクターIDを取得
   * minLevel以上のキャラクターのみを返す
   * minLevel未満が出現した時点で早期終了（レベル降順でソート済みのため）
   */
  fetchAllCharacterIds(key: SearchKey): Promise<string[]>;
}

/**
 * キャラクター一覧フェッチャーを作成
 */
export function createCharacterListFetcher(
  httpClient: HttpClient,
  config?: Partial<CharacterListFetcherConfig>,
): CharacterListFetcher {
  const finalConfig: CharacterListFetcherConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  return {
    async fetchAllCharacterIds(key: SearchKey): Promise<string[]> {
      const characterIds: string[] = [];
      let page = 1;
      let shouldContinue = true;

      while (shouldContinue) {
        // セーフガード：ページ数上限チェック
        if (page > finalConfig.maxPages) {
          console.log(
            `[CharacterListFetcher] Reached max page limit (${finalConfig.maxPages}), stopping`,
          );
          break;
        }

        const url = buildSearchUrl(key, page === 1 ? undefined : page);
        console.log(`[CharacterListFetcher] Fetching ${url}`);

        const result = await httpClient.fetchWithRateLimit(url);

        if (!result.success || !result.html) {
          console.log(`[CharacterListFetcher] HTTP error: ${result.error}`);
          break;
        }

        const parsed = parseCharacterListPage(result.html);

        // ページネーション情報をログ出力
        if (parsed.currentPage !== undefined && parsed.totalPages !== undefined) {
          console.log(
            `[CharacterListFetcher] Page ${parsed.currentPage}/${parsed.totalPages}, found ${parsed.characters.length} characters`,
          );
        }

        if (parsed.characters.length === 0) {
          console.log(`[CharacterListFetcher] No characters found`);
          break;
        }

        // レベルフィルタリングと早期終了チェック
        for (const char of parsed.characters) {
          if (char.level >= finalConfig.minLevel) {
            characterIds.push(char.characterId);
          } else {
            // minLevel未満が出現 → 以降は全てminLevel未満なので早期終了
            console.log(
              `[CharacterListFetcher] Found level ${char.level} < ${finalConfig.minLevel}, early termination`,
            );
            shouldContinue = false;
            break;
          }
        }

        // 次のページがない場合は終了
        if (!parsed.hasNextPage) {
          shouldContinue = false;
        }

        page++;
      }

      console.log(`[CharacterListFetcher] Total ${characterIds.length} characters found`);
      return characterIds;
    },
  };
}
