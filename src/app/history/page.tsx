'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentBillingPeriod, formatDateToISO } from '@/utils/date';
import { DEFAULT_BILLING_START_DAY, PSYCHOLOGICAL_CATEGORIES } from '@/lib/constants';
import { Transaction, PsychologicalCategory } from '@/types';
import { formatCurrency } from '@/utils/budget';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());



export default function HistoryPage() {
  const [mounted, setMounted] = useState(false);

  const { data, error, isLoading, mutate } = useSWR('/api/dashboard/init', fetcher, { 
    revalidateOnFocus: true,
    refreshInterval: 5000
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, itemName: string) => {
    if (!confirm(`「${itemName}」の履歴を削除しますか？`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/transactions?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        mutate();
      } else {
        alert('削除に失敗しました');
      }
    } catch (err) {
      console.error(err);
      alert('通信エラーが発生しました');
    } finally {
      setDeletingId(null);
    }
  };

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleTogglePending = async (id: string, currentStatus: boolean) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/transactions?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pending: !currentStatus }),
      });
      if (res.ok) {
        mutate();
      } else {
        alert('更新に失敗しました');
      }
    } catch (err) {
      console.error(err);
      alert('通信エラーが発生しました');
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const transactions: Transaction[] = data?.transactions || [];
  
  // SWRでロード中はスケルトンを表示
  const period = data?.period || {
    startDate: formatDateToISO(new Date()),
    endDate: formatDateToISO(new Date())
  };

  // 日付ごとにグループ化
  const groupedByDate = transactions.reduce<Record<string, Transaction[]>>((acc, t) => {
    if (!acc[t.transaction_date]) acc[t.transaction_date] = [];
    acc[t.transaction_date].push(t);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  // 今月の総支出（保留中は除外）
  const totalSpent = transactions
    .filter(t => !t.is_pending)
    .reduce((sum, t) => sum + t.amount, 0);

  if (!mounted || isLoading || (!data && !error)) {
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
              {typeof period.startDate === 'string' ? period.startDate.slice(5) : ''} 〜 {typeof period.endDate === 'string' ? period.endDate.slice(5) : ''}
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
        const dailyTotal = items
          .filter(t => !t.is_pending)
          .reduce((sum, t) => sum + t.amount, 0);

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
                    className={`rounded-xl border border-border/30 bg-card/50 p-3 backdrop-blur-sm transition-opacity ${t.is_pending ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium">{t.item_name}</p>
                          {t.is_pending && (
                            <Badge variant="outline" className="h-4 px-1.5 text-[8px] bg-orange-100/50 text-orange-600 border-orange-200">
                              保留中
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {psychMeta && !t.is_pending && (
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
                      <div className="flex flex-col items-end gap-2 ml-3">
                        <span className={`text-sm font-bold whitespace-nowrap ${t.is_pending ? 'text-muted-foreground line-through' : 'text-red-400'}`}>
                          -{new Intl.NumberFormat('ja-JP').format(t.amount)}円
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={updatingId === t.id}
                            className={`h-7 w-7 transition-colors ${t.is_pending ? 'text-orange-500 hover:bg-orange-50' : 'text-muted-foreground hover:bg-muted'}`}
                            onClick={() => handleTogglePending(t.id, !!t.is_pending)}
                          >
                            {updatingId === t.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Clock className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === t.id}
                            className="h-7 w-7 text-muted-foreground hover:text-red-500 transition-colors"
                            onClick={() => handleDelete(t.id, t.item_name)}
                          >
                            {deletingId === t.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {transactions.length === 0 && !isLoading && (
        <div className="py-20 text-center flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center">
            <Trash2 className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">支出データがありません</p>
        </div>
      )}
    </div>
  );
}
