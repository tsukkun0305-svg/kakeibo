import { BudgetSummary, Transaction } from '@/types';
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
 * 固定費（家賃、サブスク、公共料金等）を日割り計算から除外する。
 *
 * @param monthlyBudget - 月間予算設定額
 * @param transactions - 今月の支出リスト
 * @param billingStartDay - 集計開始日
 * @param today - 基準日（デフォルト: 当日）
 * @returns BudgetSummary
 */
export function getBudgetSummary(
  monthlyBudget: number,
  transactions: Transaction[],
  billingStartDay: number,
  today: Date = new Date()
): BudgetSummary {
  // 1. カウント対象外（保留中）を除外
  const activeTransactions = transactions.filter(t => !t.is_pending);

  // 2. 総支出を計算
  const totalSpent = activeTransactions.reduce((sum, t) => sum + t.amount, 0);

  // 3. 固定費（家賃、サブスク、光熱費、通信費）を分離
  const fixedCategories = ['housing', 'utility', 'communication'];
  const fixedSpent = activeTransactions
    .filter(t => fixedCategories.includes(t.general_category) || t.source_subscription_id)
    .reduce((sum, t) => sum + t.amount, 0);

  // 4. 流動費（それ以外の日常的な支出）
  const flexibleSpent = totalSpent - fixedSpent;

  // 5. 残り予算と残り日数
  const remainingBudget = monthlyBudget - totalSpent;
  const remainingDays = getRemainingDays(billingStartDay, today);

  // 6. 1日に使える金額（固定費を差し引いた残り予算を日割り）
  // (月間予算 - 固定費合計 - すでに使った流動費) / 残り日数
  const dailyBudget = remainingDays > 0 
    ? Math.max(Math.floor(remainingBudget / remainingDays), 0)
    : 0;

  return {
    monthlyBudget,
    totalSpent,
    fixedSpent,
    flexibleSpent,
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
