import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { GENERAL_CATEGORIES } from '@/lib/constants';
import { PsychologicalCategory } from '@/types';

// ルールベースの代替判定ロジック
function getFallbackCategory(itemName: string, generalCategory: string): { cat: PsychologicalCategory, reason: string } {
  const gCategoryMap: Record<string, PsychologicalCategory> = {
    food: 'reward',
    daily: 'necessity',
    hobby: 'stress_relief',
    social: 'vanity',
    transport: 'necessity',
    fixed: 'necessity',
    other: 'habit',
  };
  return { 
    cat: gCategoryMap[generalCategory] || 'habit',
    reason: '自動判定による分類結果です。'
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { transactionId, itemName, amount, generalCategory, userMemo } = body;

    if (!transactionId || !itemName || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let aiPsychologicalCategory: PsychologicalCategory | null = null;
    let aiReason = '';

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const fallback = getFallbackCategory(itemName, generalCategory);
      aiPsychologicalCategory = fallback.cat;
      aiReason = fallback.reason;
    } else {
      const openai = new OpenAI({ apiKey });
      const prompt = `以下の支出情報を分析し、背後にある心理要因を推測してください。

【支出情報】
品名（または内容）: ${itemName}
金額: ${amount}円
一般カテゴリ: ${GENERAL_CATEGORIES[generalCategory as keyof typeof GENERAL_CATEGORIES] || 'その他'}
追加メモ: ${userMemo || 'なし'}

以下の5つの心理カテゴリから最も適切なものを1つ選び、その理由を短く（箇条書きなし、20文字程度で）説明してください。

【心理カテゴリ】
- stress_relief (ストレス発散・衝動買い)
- vanity (見栄・承認欲求)
- habit (習慣・惰性)
- reward (ご褒美・自己肯定)
- self_investment (純粋な自己投資)
- necessity (生活必需品・固定費)

出力は必ず以下のJSONフォーマットのみとしてください。
{
"category": "stress_relief" | "vanity" | "habit" | "reward" | "self_investment" | "necessity",
"reason": "短い理由"
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      if (content) {
        const result = JSON.parse(content);
        aiPsychologicalCategory = result.category;
        aiReason = result.reason;
      } else {
        throw new Error('No content from OpenAI');
      }
    }

    // 取得したAI分析結果でTransactionsテーブルをUPDATEする
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        ai_psychological_category: aiPsychologicalCategory,
        ai_reason: aiReason,
      })
      .eq('id', transactionId)
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, aiPsychologicalCategory, aiReason });
  } catch (err) {
    console.error('Background AI Classification Error:', err);
    // 失敗してもクライアント側は既に完了扱いとしているため、ログに落とすだけにする
    return NextResponse.json({ error: 'Background sync failed' }, { status: 500 });
  }
}
