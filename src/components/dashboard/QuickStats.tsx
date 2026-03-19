'use client';

import { Calendar, Flame, PiggyBank, ArrowDownRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { BudgetSummary } from '@/types';
import { formatCurrency } from '@/utils/budget';
import { getCurrentBillingPeriod, getElapsedDays, getTotalDaysInPeriod, formatDateToISO } from '@/utils/date';

interface QuickStatsProps {
  summary: BudgetSummary;
  billingStartDay: number;
  todaySpent: number;
}

export default function QuickStats({ summary, billingStartDay, todaySpent }: QuickStatsProps) {
  const today = new Date();
  const period = getCurrentBillingPeriod(billingStartDay, today);
  const elapsed = getElapsedDays(billingStartDay, today);
  const total = getTotalDaysInPeriod(billingStartDay, today);

  // 日平均支出
  const avgDailySpent = elapsed > 0 ? Math.round(summary.totalSpent / elapsed) : 0;

  const stats = [
    {
      icon: Calendar,
      label: '集計期間',
      value: `${formatDateToISO(period.startDate).slice(5)} 〜 ${formatDateToISO(period.endDate).slice(5)}`,
      sub: `${elapsed}日目 / ${total}日`,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: ArrowDownRight,
      label: '今日の支出',
      value: formatCurrency(todaySpent),
      sub: todaySpent > summary.dailyBudget ? '目安を超過中' : '目安内',
      color: todaySpent > summary.dailyBudget ? 'text-red-400' : 'text-emerald-400',
      bgColor: todaySpent > summary.dailyBudget ? 'bg-red-500/10' : 'bg-emerald-500/10',
    },
    {
      icon: Flame,
      label: '日平均支出',
      value: formatCurrency(avgDailySpent),
      sub: `目安: ${formatCurrency(summary.dailyBudget)}/日`,
      color: avgDailySpent > summary.dailyBudget ? 'text-amber-400' : 'text-emerald-400',
      bgColor: avgDailySpent > summary.dailyBudget ? 'bg-amber-500/10' : 'bg-emerald-500/10',
    },
    {
      icon: PiggyBank,
      label: '残り予算',
      value: formatCurrency(summary.remainingBudget),
      sub: `残り ${summary.remainingDays} 日`,
      color: summary.remainingBudget < 0 ? 'text-red-400' : 'text-emerald-400',
      bgColor: summary.remainingBudget < 0 ? 'bg-red-500/10' : 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map(({ icon: Icon, label, value, sub, color, bgColor }) => (
        <Card key={label} className="border-border/30 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-3.5">
            <div className="mb-2 flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${bgColor}`}>
                <Icon className={`h-3.5 w-3.5 ${color}`} />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
            </div>
            <p className="text-sm font-bold leading-tight">{value}</p>
            <p className={`mt-0.5 text-[10px] ${color}`}>{sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
