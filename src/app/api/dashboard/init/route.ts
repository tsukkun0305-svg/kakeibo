import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentBillingPeriod, formatDateToISO } from '@/utils/date';
import { DEFAULT_BILLING_START_DAY, DEFAULT_MONTHLY_BUDGET } from '@/lib/constants';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. 設定情報の取得
    const { data: settingsData } = await supabase
      .from('users')
      .select('monthly_budget, billing_start_day')
      .eq('id', user.id)
      .single();

    const budget = settingsData?.monthly_budget ?? DEFAULT_MONTHLY_BUDGET;
    const startDay = settingsData?.billing_start_day ?? DEFAULT_BILLING_START_DAY;

    // 2. 固定費の自動同期処理（サーバーサイドで行うことでフロントの通信を減らす）
    // 実際にAPIをフェッチする代わりに直接DBを操作する
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    const today = new Date();
    const period = getCurrentBillingPeriod(startDay, today);
    const startDate = formatDateToISO(period.startDate);
    const endDate = formatDateToISO(period.endDate);

    if (subs && subs.length > 0) {
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('source_subscription_id')
        .eq('user_id', user.id)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .not('source_subscription_id', 'is', null);

      const existingIds = new Set(existingTx?.map(t => t.source_subscription_id));
      const toInsert = subs.filter(sub => !existingIds.has(sub.id));

      if (toInsert.length > 0) {
        const transactionsToInsert = toInsert.map(sub => {
          const targetDate = new Date(period.startDate);
          targetDate.setDate(sub.billing_day);
          if (targetDate < period.startDate) {
            targetDate.setMonth(targetDate.getMonth() + 1);
          }
          return {
            user_id: user.id,
            transaction_date: formatDateToISO(targetDate),
            amount: sub.amount,
            item_name: sub.name,
            general_category: 'fixed',
            user_memo: '自動計上 (サブスクリプション)',
            source_subscription_id: sub.id,
            ai_psychological_category: 'necessity',
            ai_reason: 'サブスクリプション・固定費のため自動判定',
          };
        });
        await supabase.from('transactions').insert(transactionsToInsert);
      }
    }

    // 3. 同期済みのトランザクションを含めて今月のデータを取得
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    return NextResponse.json({
      settings: { monthly_budget: budget, billing_start_day: startDay },
      transactions: transactions || [],
      period: { startDate, endDate }
    });
  } catch (err) {
    console.error('Dashboard Init Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
