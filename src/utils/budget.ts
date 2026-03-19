import { BudgetSummary } from '@/types';
import { getRemainingDays } from './date';

/**
 * 残り予算を算出する。
 *
 * @param monthlyBudget - 月間予算設定額
 * @param totalSpent - 今月の総支出額
 * @returns 残り予算（マイナスになる場合もそのまま返す）
 */
export function getRemainingBudget(monthlyBudget: number, totalSpent: number): number {
  return monthlyBudget - totalSpent;
}

/**
 * 1日に使える金額（日割り予算）を算出する。
 *
 * @param remainingBudget - 残り予算
 * @param remainingDays - 残り日数
 * @returns 1日に使える金額（0未満の場合は0を返す）
 */
export function getDailyBudget(remainingBudget: number, remainingDays: number): number {
  if (remainingDays <= 0) return 0;
  const daily = Math.floor(remainingBudget / remainingDays);
  return Math.max(daily, 0);
}

/**
 * 予算サマリーを一括算出する。
 *
 * @param monthlyBudget - 月間予算設定額
 * @param totalSpent - 今月の総支出額
 * @param billingStartDay - 集計開始日
 * @param today - 基準日（デフォルト: 当日）
 * @returns BudgetSummary
 */
export function getBudgetSummary(
  monthlyBudget: number,
  totalSpent: number,
  billingStartDay: number,
  today: Date = new Date()
): BudgetSummary {
  const remainingBudget = getRemainingBudget(monthlyBudget, totalSpent);
  const remainingDays = getRemainingDays(billingStartDay, today);
  const dailyBudget = getDailyBudget(remainingBudget, remainingDays);

  return {
    monthlyBudget,
    totalSpent,
    remainingBudget,
    remainingDays,
    dailyBudget,
  };
}

/**
 * 金額を日本円フォーマットに変換する。
 * 例: 15000 → "¥15,000"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * 予算消費率（%）を算出する。
 */
export function getBudgetUsagePercent(monthlyBudget: number, totalSpent: number): number {
  if (monthlyBudget <= 0) return 0;
  return Math.round((totalSpent / monthlyBudget) * 100);
}
