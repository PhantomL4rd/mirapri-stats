import { type ClassValue, clsx } from 'clsx';
import dayjs from 'dayjs';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * パスに version クエリパラメータを付与する
 * 過去データ閲覧時にリンク間で version を保持するために使用
 */
export function versionedHref(path: string, version?: string): string {
  if (!version) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}version=${version}`;
}

/**
 * 日付文字列を YYYY/MM/DD 形式にフォーマットする
 */
export function formatDateFull(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

/**
 * 日付文字列を MM/DD 形式にフォーマットする
 */
export function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${m}/${d}`;
}

/**
 * 次回データ更新予定日を計算（毎月第1水曜日の次の土曜日）
 *
 * @param dataTo 現在の統計期間の終了日
 * @returns 次回更新予定日（YYYY-MM-DD形式）、計算不可の場合は null
 */
export function getNextUpdateDate(dataTo: string | null): string | null {
  if (!dataTo) return null;

  const endDate = dayjs(dataTo);
  if (!endDate.isValid()) return null;

  // 翌月の1日
  const nextMonth = endDate.add(1, 'month').startOf('month');

  // 翌月の第1水曜日を求める
  let firstWednesday = nextMonth.day(3);
  if (firstWednesday.isBefore(nextMonth)) {
    firstWednesday = firstWednesday.add(1, 'week');
  }

  // 第1水曜日の次の土曜日（3日後）
  const nextUpdate = firstWednesday.add(3, 'day');

  return nextUpdate.format('YYYY-MM-DD');
}
