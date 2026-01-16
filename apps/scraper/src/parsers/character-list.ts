import * as cheerio from 'cheerio';

/**
 * キャラクター情報
 */
export interface CharacterInfo {
  characterId: string;
  level: number;
}

/**
 * キャラクター一覧ページの解析結果
 */
export interface CharacterListResult {
  characters: CharacterInfo[];
  hasNextPage: boolean;
  /** 現在のページ番号（パース失敗時は undefined） */
  currentPage?: number;
  /** 総ページ数（パース失敗時は undefined） */
  totalPages?: number;
}

/**
 * Lodestone検索結果ページをパースしてキャラクター情報を抽出する
 */
export function parseCharacterListPage(html: string): CharacterListResult {
  const $ = cheerio.load(html);
  const characters: CharacterInfo[] = [];

  // キャラクターエントリーを取得
  $('.entry').each((_, entry) => {
    const $entry = $(entry);
    const link = $entry.find('a.entry__link').attr('href');

    // キャラクターIDを抽出（/lodestone/character/{id}/形式）
    const characterIdMatch = link?.match(/\/lodestone\/character\/(\d+)\//);
    if (!characterIdMatch?.[1]) {
      return; // スキップ
    }
    const characterId = characterIdMatch[1];

    // レベルを抽出（entry__chara_info内の最初のliのspan）
    const levelText = $entry.find('.entry__chara_info li:first-child span').text().trim();
    const level = Number.parseInt(levelText, 10);
    if (Number.isNaN(level)) {
      return; // スキップ
    }

    characters.push({ characterId, level });
  });

  // ページネーション情報をパース（「1ページ / 3ページ」形式）
  const pagerText = $('.btn__pager__current').text().trim();
  const pagerMatch = pagerText.match(/(\d+)ページ\s*\/\s*(\d+)ページ/);

  // 次のページがあるかを判定
  // 1. btn__pager__next が存在する
  // 2. かつ、ページ情報がパースできた場合は currentPage < totalPages
  const hasNextButton = $('.btn__pager__next').length > 0;

  if (pagerMatch?.[1] && pagerMatch[2]) {
    const currentPage = Number.parseInt(pagerMatch[1], 10);
    const totalPages = Number.parseInt(pagerMatch[2], 10);
    const hasNextPage = hasNextButton && currentPage < totalPages;
    return { characters, hasNextPage, currentPage, totalPages };
  }

  // ページネーション情報がない場合
  return { characters, hasNextPage: hasNextButton };
}
