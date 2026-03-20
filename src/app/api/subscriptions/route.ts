import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('billing_day', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ subscriptions: data || [] });
  } catch (err: any) {
    console.error('API GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, amount, billing_day } = body;

    if (!name || !amount || !billing_day) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        name,
        amount: Number(amount),
        billing_day: Number(billing_day),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ subscription: data }, { status: 201 });
  } catch (err: any) {
    console.error('API POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error', details: err }, { status: 500 });
  }
}
