import * as cheerio from 'cheerio';

/**
 * Lodestone 装備個別ページから高解像度アイコン URL を抽出
 * og:image メタタグから取得（最もシンプルで確実）
 *
 * @param html Lodestone 装備個別ページの HTML
 * @returns アイコン URL（例: https://lds-img.finalfantasyxiv.com/itemicon/0b/...png?n7.41）、取得できない場合は null
 */
export function parseItemIconUrl(html: string): string | null {
  const $ = cheerio.load(html);
  const ogImage = $('meta[property="og:image"]').attr('content');
  return ogImage ?? null;
}
