'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GENERAL_CATEGORIES } from '@/lib/constants';
import { Transaction, GeneralCategory } from '@/types';
import { formatCurrency } from '@/utils/budget';

interface CategoryChartProps {
  transactions: Transaction[];
}

const CATEGORY_COLORS: Record<string, string> = {
  food: '#22c55e',
  daily_necessities: '#3b82f6',
  transportation: '#8b5cf6',
  entertainment: '#f59e0b',
  clothing: '#ec4899',
  healthcare: '#14b8a6',
  education: '#6366f1',
  housing: '#64748b',
  utility: '#f97316',
  communication: '#06b6d4',
  hobby: '#a855f7',
  social: '#e11d48',
  other: '#78716c',
};

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  key: string;
  percent: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-border/40 bg-background/95 px-3 py-2 shadow-lg backdrop-blur-sm">
        <p className="text-xs font-semibold">{data.name}</p>
        <p className="text-sm font-bold" style={{ color: data.color }}>
          {formatCurrency(data.value)}
        </p>
        <p className="text-[10px] text-muted-foreground">{data.percent}%</p>
      </div>
    );
  }
  return null;
};

export default function CategoryChart({ transactions }: CategoryChartProps) {
  const chartData = useMemo<ChartDataItem[]>(() => {
    const categoryMap: Record<string, number> = {};
    let total = 0;

    transactions.forEach((t) => {
      categoryMap[t.general_category] = (categoryMap[t.general_category] || 0) + t.amount;
      total += t.amount;
    });

    return Object.entries(categoryMap)
      .map(([key, value]) => ({
        name: GENERAL_CATEGORIES[key as GeneralCategory] || key,
        value,
        color: CATEGORY_COLORS[key] || '#78716c',
        key,
        percent: total > 0 ? Math.round((value / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  if (chartData.length === 0) {
    return (
      <Card className="border-border/40">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">データがありません</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* パイチャート */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">費目別 内訳</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mx-auto h-52 w-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* カテゴリ別ランキング */}
      <div className="space-y-2">
        {chartData.map((item, index) => (
          <div
            key={item.key}
            className="flex items-center gap-3 rounded-xl border border-border/30 bg-card/50 p-3 backdrop-blur-sm"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
              {index + 1}
            </span>
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.name}</span>
                <span className="text-sm font-bold">{formatCurrency(item.value)}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${item.percent}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{item.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
