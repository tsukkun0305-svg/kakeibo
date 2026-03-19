'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCurrentBillingPeriod, formatDateToISO } from '@/utils/date';
import { DEFAULT_BILLING_START_DAY, PSYCHOLOGICAL_CATEGORIES } from '@/lib/constants';
import { Transaction, PsychologicalCategory } from '@/types';
import { formatCurrency } from '@/utils/budget';



export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const today = new Date();
  const period = getCurrentBillingPeriod(DEFAULT_BILLING_START_DAY, today);

  const fetchTransactions = useCallback(async () => {
    try {
      const startDate = formatDateToISO(period.startDate);
      const endDate = formatDateToISO(period.endDate);
      const res = await fetch(`/api/transactions?startDate=${startDate}&endDate=${endDate}`);

      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      } else {
        setTransactions([]);
      }
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchTransactions();
  }, [fetchTransactions]);

  // 日付ごとにグループ化
  const groupedByDate = transactions.reduce<Record<string, Transaction[]>>((acc, t) => {
    if (!acc[t.transaction_date]) acc[t.transaction_date] = [];
    acc[t.transaction_date].push(t);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  // 今月の総支出
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);

  if (!mounted || loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/20" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* サマリー */}
      <Card className="border-border/40 bg-card/50">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {formatDateToISO(period.startDate).slice(5)} 〜 {formatDateToISO(period.endDate).slice(5)}
            </p>
            <p className="text-lg font-bold">今月の支出合計</p>
          </div>
          <p className="text-2xl font-extrabold text-red-400">
            {formatCurrency(totalSpent)}
          </p>
        </CardContent>
      </Card>

      {/* 日付ごとの支出リスト */}
      {sortedDates.map((date) => {
        const items = groupedByDate[date];
        const dailyTotal = items.reduce((sum, t) => sum + t.amount, 0);

        return (
          <div key={date}>
            {/* 日付ヘッダー */}
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-muted-foreground">{date}</span>
              <span className="text-xs font-bold text-red-400">
                {formatCurrency(dailyTotal)}
              </span>
            </div>

            {/* 支出アイテム */}
            <div className="space-y-1.5">
              {items.map((t) => {
                const psychMeta = t.ai_psychological_category
                  ? PSYCHOLOGICAL_CATEGORIES[t.ai_psychological_category as PsychologicalCategory]
                  : null;

                return (
                  <div
                    key={t.id}
                    className="rounded-xl border border-border/30 bg-card/50 p-3 backdrop-blur-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{t.item_name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {psychMeta && (
                            <Badge
                              variant="outline"
                              className="h-5 text-[10px] gap-0.5 border-0"
                              style={{
                                backgroundColor: `${psychMeta.color}15`,
                                color: psychMeta.color,
                              }}
                            >
                              {psychMeta.emoji} {psychMeta.label}
                            </Badge>
                          )}
                          {t.user_memo && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                              💭 {t.user_memo}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="ml-3 text-sm font-bold text-red-400 whitespace-nowrap">
                        -{new Intl.NumberFormat('ja-JP').format(t.amount)}円
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {transactions.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">支出データがありません</p>
        </div>
      )}
    </div>
  );
}
