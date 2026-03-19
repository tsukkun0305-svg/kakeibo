'use client';

import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { BudgetSummary } from '@/types';
import { formatCurrency, getBudgetUsagePercent } from '@/utils/budget';

interface BudgetCardProps {
  summary: BudgetSummary;
}

export default function BudgetCard({ summary }: BudgetCardProps) {
  const { monthlyBudget, totalSpent, remainingBudget, remainingDays, dailyBudget } = summary;
  const usagePercent = getBudgetUsagePercent(monthlyBudget, totalSpent);
  const isOverBudget = remainingBudget < 0;
  const isWarning = usagePercent > 80;

  return (
    <div className="space-y-4">
      {/* メインカード: 今日使える金額 */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20">
        {/* 背景装飾 */}
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute right-4 top-4 h-16 w-16 rounded-full bg-white/5" />

        <CardContent className="relative p-6">
          <div className="mb-1 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-white/80" />
            <span className="text-xs font-medium text-white/80">今日使える金額</span>
          </div>

          <div className="mb-4">
            <span className="text-4xl font-extrabold tracking-tight">
              {formatCurrency(dailyBudget)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/70">
            <span>残り {remainingDays} 日</span>
            <span className="text-white/30">•</span>
            <span>残り予算 {formatCurrency(remainingBudget)}</span>
          </div>
        </CardContent>
      </Card>

      {/* 予算消費バー */}
      <div className="px-1">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">今月の予算消費</span>
          <span className={`text-xs font-semibold ${isOverBudget ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-500'}`}>
            {usagePercent}%
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/50">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isOverBudget
                ? 'bg-gradient-to-r from-red-500 to-red-400'
                : isWarning
                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                : 'bg-gradient-to-r from-emerald-500 to-teal-400'
            }`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
          <span>{formatCurrency(totalSpent)} 使用</span>
          <span>{formatCurrency(monthlyBudget)}</span>
        </div>
      </div>
    </div>
  );
}
