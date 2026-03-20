'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BudgetCard from '@/components/dashboard/BudgetCard';
import QuickStats from '@/components/dashboard/QuickStats';
import TransactionForm from '@/components/transaction/TransactionForm';
import { getCurrentBillingPeriod, formatDateToISO } from '@/utils/date';
import { getBudgetSummary } from '@/utils/budget';
import { DEFAULT_BILLING_START_DAY, DEFAULT_MONTHLY_BUDGET } from '@/lib/constants';
import { Transaction, BudgetSummary } from '@/types';


export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userSettings, setUserSettings] = useState<{monthly_budget: number, billing_start_day: number} | null>(null);

  const today = new Date();

  const fetchSettingsAndTransactions = useCallback(async () => {
    try {
      setLoading(true);
      // 1. 設定を取得
      let budget = DEFAULT_MONTHLY_BUDGET;
      let startDay = DEFAULT_BILLING_START_DAY;
      
      const settingsRes = await fetch('/api/user/settings');
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        if (data.settings) {
          budget = data.settings.monthly_budget;
          startDay = data.settings.billing_start_day;
          setUserSettings({ monthly_budget: budget, billing_start_day: startDay });
        }
      }

      // 2. 設定情報から集計期間を計算してトランザクションを取得
      const period = getCurrentBillingPeriod(startDay, today);
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
    fetchSettingsAndTransactions();
  }, [fetchSettingsAndTransactions]);

  // 今月の総支出を計算
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);

  // 今日の支出
  const todayStr = formatDateToISO(today);
  const todaySpent = transactions
    .filter((t) => t.transaction_date === todayStr)
    .reduce((sum, t) => sum + t.amount, 0);

  // 予算サマリー計算
  const currentBudget = userSettings?.monthly_budget ?? DEFAULT_MONTHLY_BUDGET;
  const currentStartDay = userSettings?.billing_start_day ?? DEFAULT_BILLING_START_DAY;
  
  const summary: BudgetSummary = getBudgetSummary(
    currentBudget,
    totalSpent,
    currentStartDay,
    today
  );

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
          ) : (
            transactions.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-border/30 bg-card/50 p-3 backdrop-blur-sm transition-colors hover:bg-card/80"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{t.item_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t.transaction_date} • {t.ai_psychological_category ? (
                      <span className="text-emerald-500">
                        {t.ai_psychological_category === 'stress_relief' && 'ストレス発散'}
                        {t.ai_psychological_category === 'vanity' && '見栄・承認欲求'}
                        {t.ai_psychological_category === 'habit' && '習慣・惰性'}
                        {t.ai_psychological_category === 'reward' && 'ご褒美'}
                        {t.ai_psychological_category === 'self_investment' && '自己投資'}
                        {t.ai_psychological_category === 'necessity' && '必要経費'}
                      </span>
                    ) : '未分類'}
                  </p>
                </div>
                <span className="ml-3 text-sm font-bold text-red-400">
                  -{new Intl.NumberFormat('ja-JP').format(t.amount)}円
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 支出入力FAB */}
      <div className="fixed bottom-20 right-4 z-40 max-w-md">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:to-teal-700 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-200"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* 支出入力フォーム */}
      {showForm && (
        <TransactionForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            fetchSettingsAndTransactions();
          }}
        />
      )}
    </div>
  );
}
