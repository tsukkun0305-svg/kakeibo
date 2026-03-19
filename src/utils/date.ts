import {
  addMonths,
  subMonths,
  setDate,
  differenceInDays,
  isAfter,
  isBefore,
  isEqual,
  startOfDay,
  getDaysInMonth,
} from 'date-fns';
import { BillingPeriod } from '@/types';

/**
 * 指定月の集計開始日を算出する。
 * 月の日数が billing_start_day より少ない場合は月末日を使用する。
 * 例: billing_start_day=31 で2月なら 2/28（or 2/29）
 */
function getSafeBillingDate(year: number, month: number, billingStartDay: number): Date {
  // month は 0-indexed (Date コンストラクタ用)
  const daysInMonth = getDaysInMonth(new Date(year, month));
  const safeDay = Math.min(billingStartDay, daysInMonth);
  return startOfDay(new Date(year, month, safeDay));
}

/**
 * 今日の日付が属する集計期間（billing period）を算出する。
 *
 * 例: billingStartDay = 25 の場合
 * - 3/25 〜 4/24 の期間中に 4/10 があれば → { startDate: 3/25, endDate: 4/24 }
 * - 4/25 〜 5/24 の期間中に 4/25 があれば → { startDate: 4/25, endDate: 5/24 }
 *
 * @param billingStartDay - 集計開始日（1〜31）
 * @param today - 基準日（デフォルト: 当日）
 * @returns 集計期間の開始日と終了日
 */
export function getCurrentBillingPeriod(
  billingStartDay: number,
  today: Date = new Date()
): BillingPeriod {
  const todayStart = startOfDay(today);
  const currentYear = todayStart.getFullYear();
  const currentMonth = todayStart.getMonth(); // 0-indexed

  // 今月の集計開始日
  const thisMonthStart = getSafeBillingDate(currentYear, currentMonth, billingStartDay);

  let startDate: Date;
  let endDate: Date;

  if (isAfter(todayStart, thisMonthStart) || isEqual(todayStart, thisMonthStart)) {
    // 今日が今月の集計開始日以降 → 今月〜来月の期間
    startDate = thisMonthStart;
    const nextMonth = addMonths(new Date(currentYear, currentMonth), 1);
    const nextMonthStart = getSafeBillingDate(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      billingStartDay
    );
    // 終了日 = 次の集計開始日の前日
    endDate = startOfDay(new Date(nextMonthStart.getTime() - 24 * 60 * 60 * 1000));
  } else {
    // 今日が今月の集計開始日より前 → 先月〜今月の期間
    const prevMonth = subMonths(new Date(currentYear, currentMonth), 1);
    startDate = getSafeBillingDate(
      prevMonth.getFullYear(),
      prevMonth.getMonth(),
      billingStartDay
    );
    // 終了日 = 今月の集計開始日の前日
    endDate = startOfDay(new Date(thisMonthStart.getTime() - 24 * 60 * 60 * 1000));
  }

  return { startDate, endDate };
}

/**
 * 今月の残り日数（今日を含む）を算出する。
 *
 * @param billingStartDay - 集計開始日（1〜31）
 * @param today - 基準日（デフォルト: 当日）
 * @returns 残り日数（最低1日）
 */
export function getRemainingDays(
  billingStartDay: number,
  today: Date = new Date()
): number {
  const { endDate } = getCurrentBillingPeriod(billingStartDay, today);
  const todayStart = startOfDay(today);
  // 今日を含む残り日数 = endDate - today + 1
  const remaining = differenceInDays(endDate, todayStart) + 1;
  return Math.max(remaining, 1);
}

/**
 * 集計期間の総日数を算出する。
 */
export function getTotalDaysInPeriod(
  billingStartDay: number,
  today: Date = new Date()
): number {
  const { startDate, endDate } = getCurrentBillingPeriod(billingStartDay, today);
  return differenceInDays(endDate, startDate) + 1;
}

/**
 * 集計期間の経過日数を算出する（今日を含む）。
 */
export function getElapsedDays(
  billingStartDay: number,
  today: Date = new Date()
): number {
  const { startDate } = getCurrentBillingPeriod(billingStartDay, today);
  const todayStart = startOfDay(today);
  return differenceInDays(todayStart, startDate) + 1;
}

/**
 * 日付を YYYY-MM-DD 形式にフォーマットする。
 */
export function formatDateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
