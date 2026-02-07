import { type ClassValue, clsx } from 'clsx';
import dayjs from 'dayjs';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
