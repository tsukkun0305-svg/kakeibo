import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentBillingPeriod, formatDateToISO } from '@/utils/date';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { billing_start_day } = body;

    // 1. アクティブなサブスクリプションを取得
    const { data: subs, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (subsError) throw subsError;
    if (!subs || subs.length === 0) {
      return NextResponse.json({ synced: 0 }); // サブスクなし
    }

    // 2. 現在の集計期間内のものを取得して重複チェックに使う
    const today = new Date();
    const period = getCurrentBillingPeriod(billing_start_day || 25, today);
    const startDate = formatDateToISO(period.startDate);
    const endDate = formatDateToISO(period.endDate);

    const { data: existingTransactions, error: txError } = await supabase
      .from('transactions')
      .select('source_subscription_id')
      .eq('user_id', user.id)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .not('source_subscription_id', 'is', null);

    if (txError) throw txError;

    // 既に今月生成済みのサブスクリプションIDのセット
    const existingIds = new Set(existingTransactions?.map(t => t.source_subscription_id));

    // 今月まだ生成されていないサブスクを特定
    const toInsert = subs.filter(sub => !existingIds.has(sub.id));

    if (toInsert.length === 0) {
      return NextResponse.json({ synced: 0 }); // 全て生成済み
    }

    // まだ生成されていないものがあれば transactions に追加
    // 請求日が月の何日にあたるかを厳密に計算する場合は period 内の該当日にする
    // 今回は簡易的に「今月の請求日（または今日以前なら今日）」として追加するが、
    // 正確には period.startDate の月の該当日にする
    const transactionsToInsert = toInsert.map(sub => {
      // 請求日の日付オブジェクトを作成
      const targetDate = new Date(period.startDate);
      targetDate.setDate(sub.billing_day);
      
      // 集計期間を越えないようにする（例：25日締めの場合、25~末日は前月、1~24日は当月だが、
      // 簡単のため単純に期間内の日付にするよう調整）
      if (targetDate < period.startDate) {
        targetDate.setMonth(targetDate.getMonth() + 1);
      }
      
      // まだ未来の請求日の場合は、今日の日付のまま生成するか、未来日付で生成するか。
      // 「アプリを開いた時」に生成するので、未来日付でもOKとする。
      const txDateStr = formatDateToISO(targetDate);

      return {
        user_id: user.id,
        transaction_date: txDateStr,
        amount: sub.amount,
        item_name: sub.name,
        general_category: 'fixed', // 固定費カテゴリ
        user_memo: '自動計上 (サブスクリプション)',
        source_subscription_id: sub.id,
        ai_psychological_category: 'necessity', // 固定費は原則的に必要経費として記録
        ai_reason: 'サブスクリプション・固定費のため自動判定',
      };
    });

    const { error: insertError } = await supabase
      .from('transactions')
      .insert(transactionsToInsert);

    if (insertError) throw insertError;

    return NextResponse.json({ synced: transactionsToInsert.length });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
