'use client';

import { useEffect, useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingBag, Brain } from 'lucide-react';
import CategoryChart from '@/components/charts/CategoryChart';
import PsychologyChart from '@/components/charts/PsychologyChart';
import { getCurrentBillingPeriod, formatDateToISO } from '@/utils/date';
import { DEFAULT_BILLING_START_DAY } from '@/lib/constants';
import { Transaction } from '@/types';



export default function AnalysisPage() {
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

  if (!mounted || loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-lg bg-muted/30" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted/20" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 期間表示 */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          集計期間: {formatDateToISO(period.startDate).slice(5)} 〜 {formatDateToISO(period.endDate).slice(5)}
        </p>
      </div>

      {/* タブ切り替え */}
      <Tabs defaultValue="psychology" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="psychology" className="gap-1.5 text-xs">
            <Brain className="h-3.5 w-3.5" />
            心理要因
          </TabsTrigger>
          <TabsTrigger value="category" className="gap-1.5 text-xs">
            <ShoppingBag className="h-3.5 w-3.5" />
            費目別
          </TabsTrigger>
        </TabsList>

        <TabsContent value="psychology" className="mt-4">
          <PsychologyChart transactions={transactions} />
        </TabsContent>

        <TabsContent value="category" className="mt-4">
          <CategoryChart transactions={transactions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
