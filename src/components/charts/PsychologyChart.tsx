'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PSYCHOLOGICAL_CATEGORIES } from '@/lib/constants';
import { Transaction, PsychologicalCategory } from '@/types';
import { formatCurrency } from '@/utils/budget';

interface PsychologyChartProps {
  transactions: Transaction[];
}

interface ChartDataItem {
  name: string;
  value: number;
  count: number;
  color: string;
  emoji: string;
  key: string;
  percent: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-border/40 bg-background/95 px-3 py-2 shadow-lg backdrop-blur-sm">
        <p className="text-xs font-semibold">
          {data.emoji} {data.name}
        </p>
        <p className="text-sm font-bold" style={{ color: data.color }}>
          {formatCurrency(data.value)}
        </p>
        <p className="text-[10px] text-muted-foreground">{data.count}件</p>
      </div>
    );
  }
  return null;
};

export default function PsychologyChart({ transactions }: PsychologyChartProps) {
  const chartData = useMemo<ChartDataItem[]>(() => {
    const psychMap: Record<string, { amount: number; count: number }> = {};
    let total = 0;

    transactions.forEach((t) => {
      const cat = t.ai_psychological_category || 'unknown';
      if (!psychMap[cat]) psychMap[cat] = { amount: 0, count: 0 };
      psychMap[cat].amount += t.amount;
      psychMap[cat].count += 1;
      total += t.amount;
    });

    return Object.entries(psychMap)
      .filter(([key]) => key in PSYCHOLOGICAL_CATEGORIES || key === 'unknown')
      .map(([key, { amount, count }]) => {
        const isUnknown = key === 'unknown';
        const meta = isUnknown ? null : PSYCHOLOGICAL_CATEGORIES[key as PsychologicalCategory];
        
        return {
          name: isUnknown ? '未分類・分析中' : (meta?.label || key),
          value: amount,
          count,
          color: isUnknown ? '#94a3b8' : (meta?.color || '#94a3b8'),
          emoji: isUnknown ? '⏳' : (meta?.emoji || '❔'),
          key,
          percent: total > 0 ? Math.round((amount / total) * 100) : 0,
        };
      })
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

  // 必要経費と未分類を除いた「浪費」の合計
  const wasteTotal = chartData
    .filter((d) => d.key !== 'necessity' && d.key !== 'unknown')
    .reduce((sum, d) => sum + d.value, 0);
  const totalAll = chartData.reduce((sum, d) => sum + d.value, 0);
  const wastePercent = totalAll > 0 ? Math.round((wasteTotal / totalAll) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 浪費率サマリー */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">浪費率（必要経費を除く）</p>
              <p className="text-2xl font-extrabold text-amber-400">{wastePercent}%</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">浪費額</p>
              <p className="text-lg font-bold text-amber-400">{formatCurrency(wasteTotal)}</p>
            </div>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
              style={{ width: `${wastePercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 横棒グラフ */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">心理要因別 内訳</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="emoji"
                  width={28}
                  tick={{ fontSize: 16 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 心理要因カード */}
      <div className="space-y-2">
        {chartData.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-3 rounded-xl border border-border/30 bg-card/50 p-3 backdrop-blur-sm"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
              style={{ backgroundColor: `${item.color}15` }}
            >
              {item.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: item.color }}>
                  {item.name}
                </span>
                <span className="text-sm font-bold">{formatCurrency(item.value)}</span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <div className="flex-1 mr-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percent}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {item.count}件 / {item.percent}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
