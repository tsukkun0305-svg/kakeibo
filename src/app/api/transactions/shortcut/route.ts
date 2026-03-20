import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// エッジランタイムなどの制限を回避するため、サーバー側で直接Supabaseを叩く用の設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// iPhoneショートカット等外部からのリクエストを受け付けるエンドポイント
export async function POST(request: Request) {
  try {
    // 1. Authorizationヘッダーからトークンを取得
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid token' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // 本来ならService Keyを使ってBypass RLSでusersテーブルを引くべきだが、
    // anon keyとRLSがある場合、usersテーブルを直接引けない可能性があるため、Service Keyを推奨。
    // 今回はテスト環境のため、とりあえずanon keyでadminとして振る舞うか確認する
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. トークンからユーザーを特定
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('shortcut_token', token)
      .single();

    if (userError || !userRecord) {
      console.error('Token verification failed:', userError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = userRecord.id;

    // 3. リクエストボディの取得
    const body = await request.json();
    const { amount, item_name, general_category, memo } = body;

    if (!amount || !item_name) {
      return NextResponse.json({ error: 'Missing required fields (amount, item_name)' }, { status: 400 });
    }

    // 4. トランザクションの作成
    const transactionDate = new Date().toISOString().split('T')[0];
    const { data: transaction, error: insertError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId,
        transaction_date: transactionDate,
        amount: Number(amount),
        item_name,
        general_category: general_category || 'other',
        user_memo: memo || 'ショートカットからの自動入力',
      })
      .select()
      .single();

    if (insertError || !transaction) {
      console.error('Failed to insert transaction:', insertError);
      return NextResponse.json({ error: 'Failed to save transaction' }, { status: 500 });
    }

    // 5. バックグラウンドAI分類の呼び出し（非同期実行して待たせない）
    // サーバーサイドから直接fetchする場合は、絶対URLか別途関数呼び出しが必要だが、
    // ここではVercelの仕様を考慮し、内部APIを呼ぶのではなくサーバーにリクエストを投げる
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    fetch(`${protocol}://${host}/api/ai/background-classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId: transaction.id,
        itemName: transaction.item_name,
        amount: transaction.amount,
        generalCategory: transaction.general_category,
        userMemo: transaction.user_memo,
      })
    }).catch(err => console.error('Shortcut background AI error:', err));

    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    console.error('Shortcut API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
