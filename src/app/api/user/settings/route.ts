import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 現在のユーザーの設定（予算・締め日など）を取得
export async function GET() {
  try {
    const supabase = await createClient();
    
    // 現在のユーザーを取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('users')
      .select('monthly_budget, billing_start_day, plan_type, shortcut_token')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Settings fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: data });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: ユーザーの設定を更新
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { monthly_budget, billing_start_day, shortcut_token } = body;

    // バリデーション
    if (monthly_budget === undefined || billing_start_day === undefined) {
      return NextResponse.json(
        { error: 'Invalid config' },
        { status: 400 }
      );
    }
    if (billing_start_day < 1 || billing_start_day > 28) {
      return NextResponse.json(
        { error: '締め日は1〜28日の間で設定してください' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // 現在のユーザーを取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updateData: any = {
      monthly_budget,
      billing_start_day,
    };
    if (shortcut_token !== undefined) {
      updateData.shortcut_token = shortcut_token;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select('monthly_budget, billing_start_day, plan_type, shortcut_token')
      .single();

    if (error) {
      console.error('Settings update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: data });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
