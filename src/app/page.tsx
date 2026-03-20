'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Camera, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BudgetCard from '@/components/dashboard/BudgetCard';
import QuickStats from '@/components/dashboard/QuickStats';
import TransactionForm from '@/components/transaction/TransactionForm';
import StatementScanner from '@/components/transaction/StatementScanner';
import { getCurrentBillingPeriod, formatDateToISO } from '@/utils/date';
import { getBudgetSummary } from '@/utils/budget';
import { DEFAULT_BILLING_START_DAY, DEFAULT_MONTHLY_BUDGET } from '@/lib/constants';
import { Transaction, BudgetSummary } from '@/types';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // SWRによるデータ取得（キャッシュと再検証）
  const { data, error, isLoading, mutate } = useSWR('/api/dashboard/init', fetcher, { 
    revalidateOnFocus: true,
    refreshInterval: 5000 // 5秒ごとにバックグラウンド取得し、AI分析結果が即時反映されるようにする
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const today = new Date();
  const transactions: Transaction[] = data?.transactions || [];
  const userSettings = data?.settings || null;
  const loading = isLoading || (!data && !error);

  // 今日の支出（保留中は除外）
  const todayStr = formatDateToISO(today);
  const todaySpent = transactions
    .filter((t) => t.transaction_date === todayStr && !t.is_pending)
    .reduce((sum, t) => sum + t.amount, 0);

  // 予算サマリー計算
  const currentBudget = userSettings?.monthly_budget ?? DEFAULT_MONTHLY_BUDGET;
  const currentStartDay = userSettings?.billing_start_day ?? DEFAULT_BILLING_START_DAY;
  
  const summary: BudgetSummary = getBudgetSummary(
    currentBudget,
    transactions, // ここを transactions に変更
    currentStartDay,
    today
  );

  const totalSpent = summary.totalSpent;

  if (!mounted) {
    return (
      <div className="space-y-4">
        {/* スケルトンローダー */}
        <div className="h-40 animate-pulse rounded-2xl bg-muted/30" />
        <div className="h-3 animate-pulse rounded-full bg-muted/20" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* メイン予算カード */}
      <BudgetCard summary={summary} />

      {/* クイック統計 */}
      <QuickStats
        summary={summary}
        billingStartDay={currentStartDay}
        todaySpent={todaySpent}
      />

      {/* 直近の支出リスト（プレビュー） */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">最近の支出</h2>
          <a href="/history" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            すべて見る →
          </a>
        </div>
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/20" />
            ))
          ) : transactions.length === 0 ? (
            <div className="rounded-xl border border-border/30 bg-card/50 p-6 text-center text-sm text-muted-foreground">
              今月の支出はまだありません。
            </div>
          ) : (
            transactions.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className={`flex items-center justify-between rounded-xl border border-border/30 bg-card/50 p-3 backdrop-blur-sm transition-colors hover:bg-card/80 ${t.is_pending ? 'opacity-50' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium">{t.item_name}</p>
                    {t.is_pending && <Clock className="h-3 w-3 text-orange-400" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {t.transaction_date} • {t.is_pending ? (
                      <span className="text-orange-400 font-medium italic">保留中 (集計除外)</span>
                    ) : (
                      <>
                        {t.ai_psychological_category ? (
                          <span className="text-emerald-500">
                            {t.ai_psychological_category === 'stress_relief' && 'ストレス発散'}
                            {t.ai_psychological_category === 'vanity' && '見栄・承認欲求'}
                            {t.ai_psychological_category === 'habit' && '習慣・惰性'}
                            {t.ai_psychological_category === 'reward' && 'ご褒美'}
                            {t.ai_psychological_category === 'self_investment' && '自己投資'}
                            {t.ai_psychological_category === 'necessity' && '必要経費'}
                          </span>
                        ) : '未分類'}
                      </>
                    )}
                  </p>
                </div>
                <span className={`ml-3 text-sm font-bold whitespace-nowrap ${t.is_pending ? 'text-muted-foreground line-through' : 'text-red-400'}`}>
                  -{new Intl.NumberFormat('ja-JP').format(t.amount)}円
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 支出入力FAB */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-3">
        <Button
          size="lg"
          variant="outline"
          className="h-12 w-12 rounded-full bg-white/80 backdrop-blur-md shadow-lg border-emerald-100 text-emerald-600 hover:bg-emerald-50 transition-all"
          onClick={() => setShowScanner(true)}
        >
          <Camera className="h-5 w-5" />
        </Button>
        <Button
          size="lg"
          className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:to-teal-700 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-200"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* 明細スキャンモーダル */}
      {showScanner && (
        <StatementScanner
          onClose={() => setShowScanner(false)}
          onSuccess={() => {
            mutate();
          }}
        />
      )}

      {/* 支出入力フォーム */}
      {showForm && (
        <TransactionForm
          onClose={() => setShowForm(false)}
          onSuccess={(transaction) => {
            setShowForm(false);
            mutate(); // 即座にキャッシュ更新（この時点では「未分類・⏳分析中」が表示される）

            // モーダルが閉じても通信がキャンセルされないよう、常に存在する親側でバックグラウンド実行
            if (transaction) {
              fetch('/api/ai/background-classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  transactionId: transaction.id,
                  itemName: transaction.item_name,
                  amount: transaction.amount,
                  generalCategory: transaction.general_category,
                  userMemo: transaction.user_memo,
                }),
              }).catch(err => console.error('Background AI trigger error:', err));
            }
          }}
        />
      )}
    </div>
  );
}
