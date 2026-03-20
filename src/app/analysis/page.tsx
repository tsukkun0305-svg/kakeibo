'use client';

import { useEffect, useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingBag, Brain } from 'lucide-react';
import CategoryChart from '@/components/charts/CategoryChart';
import PsychologyChart from '@/components/charts/PsychologyChart';
import { getCurrentBillingPeriod, formatDateToISO } from '@/utils/date';
import { DEFAULT_BILLING_START_DAY } from '@/lib/constants';
import { Transaction } from '@/types';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());



export default function AnalysisPage() {
  const [mounted, setMounted] = useState(false);
  const { data, error, isLoading } = useSWR('/api/dashboard/init', fetcher, { 
    revalidateOnFocus: true,
    refreshInterval: 5000
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const transactions: Transaction[] = data?.transactions || [];

  const period = data?.period || {
    startDate: formatDateToISO(new Date()),
    endDate: formatDateToISO(new Date())
  };

  if (!mounted || isLoading || (!data && !error)) {
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
          集計期間: {typeof period.startDate === 'string' ? period.startDate.slice(5) : ''} 〜 {typeof period.endDate === 'string' ? period.endDate.slice(5) : ''}
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
