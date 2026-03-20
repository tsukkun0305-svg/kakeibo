import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 指定期間の支出を取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const supabase = await createClient();
    
    // 現在のユーザーを取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user.id;

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false });

    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }
    if (endDate) {
      query = query.lte('transaction_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ transactions: data || [] });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      transaction_date,
      amount,
      item_name,
      general_category,
      user_memo = '',
      ai_psychological_category = null,
      ai_reason = null,
    } = body;

    // バリデーション
    if (!amount || !item_name || !general_category) {
      return NextResponse.json(
        { error: '必須項目が入力されていません（金額、品名、費目）' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // 現在のユーザーを取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user_id = user.id;

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id,
        transaction_date: transaction_date || new Date().toISOString().split('T')[0],
        amount: Number(amount),
        item_name,
        general_category,
        user_memo,
        ai_psychological_category,
        ai_reason,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ transaction: data }, { status: 201 });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: 支出を削除
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // 現在のユーザーを取得して本人のデータか確認（RLSでも守られるが明示的にチェック）
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: 支出を更新（保留への切り替えなど）
export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // 現在のユーザーを取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 更新可能なフィールドを抽出
    const updateData: any = {};
    if (body.item_name !== undefined) updateData.item_name = body.item_name;
    if (body.amount !== undefined) updateData.amount = Number(body.amount);
    if (body.transaction_date !== undefined) updateData.transaction_date = body.transaction_date;
    if (body.general_category !== undefined) updateData.general_category = body.general_category;
    if (body.user_memo !== undefined) updateData.user_memo = body.user_memo;
    if (body.is_pending !== undefined) updateData.is_pending = body.is_pending;

    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ transaction: data });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
