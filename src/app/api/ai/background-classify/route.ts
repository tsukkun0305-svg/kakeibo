import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  console.log('[AI Check] Background AI classify started');
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[AI Check] Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('[AI Check] Request Body:', body);
    const { transactionId, itemName, amount, generalCategory, userMemo } = body;

    if (!transactionId || !itemName || !amount) {
      console.log('[AI Check] Missing fields:', { transactionId, itemName, amount });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let aiPsychologicalCategory: PsychologicalCategory | null = null;
    let aiReason = '';

    const apiKey = process.env.GEMINI_API_KEY;
    console.log('[AI Check] Gemini API Key exists:', !!apiKey);

    if (!apiKey) {
      console.log('[AI Check] Using fallback rules');
      const fallback = getFallbackCategory(itemName, generalCategory);
      aiPsychologicalCategory = fallback.cat;
      aiReason = fallback.reason;
    } else {
      console.log('[AI Check] Calling Gemini...');
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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

        const response = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
          }
        });

        console.log('[AI Check] Gemini returned successfully');

        const content = response.response.text();
        if (content) {
          const result = JSON.parse(content);
          aiPsychologicalCategory = result.category;
          aiReason = result.reason;
          console.log('[AI Check] parsed result:', result);
        } else {
          throw new Error('No content from Gemini');
        }
      } catch (aiError: any) {
        console.error('[AI Check] Gemini API Error:', aiError?.message || aiError);
        console.log('[AI Check] Gracefully falling back to rule-based logic');
        const fallback = getFallbackCategory(itemName, generalCategory);
        aiPsychologicalCategory = fallback.cat;
        aiReason = fallback.reason + ' (AI利用制限のため独自の自動判定)';
      }
    }

    // 取得したAI分析結果でTransactionsテーブルをUPDATEする
    console.log('[AI Check] Executing Supabase UPDATE...', { transactionId, category: aiPsychologicalCategory });
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        ai_psychological_category: aiPsychologicalCategory,
        ai_reason: aiReason,
      })
      .eq('id', transactionId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[AI Check] Supabase update failed:', updateError);
      throw updateError;
    }
    console.log('[AI Check] Background AI classify SUCCESS');

    return NextResponse.json({ success: true, aiPsychologicalCategory, aiReason });
  } catch (err) {
    console.error('Background AI Classification Error:', err);
    // 失敗してもクライアント側は既に完了扱いとしているため、ログに落とすだけにする
    return NextResponse.json({ error: 'Background sync failed' }, { status: 500 });
  }
}
