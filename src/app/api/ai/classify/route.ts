import { NextResponse } from 'next/server';
import { createOpenAIClient } from '@/lib/openai';

const SYSTEM_PROMPT = `あなたは消費心理分析の専門家です。ユーザーの支出データを分析し、その購入の心理的要因を判定してください。

以下の6つのカテゴリーのいずれか1つに分類してください：

1. stress_relief（ストレス発散）: イライラ、疲労、不安、気分転換のための消費
2. vanity（見栄・承認欲求）: SNS映え、他人へのアピール、流行を追う、周囲への見栄
3. habit（習慣・惰性）: いつものコンビニ、無意識の購入、ルーティン化した消費
4. reward（ご褒美）: 達成感、自分へのご褒美、自己肯定のための消費
5. self_investment（自己投資）: 学習、健康、スキルアップ、キャリアアップのための消費
6. necessity（必要経費）: 生活必需品、固定費、避けられない出費

必ず以下のJSON形式で応答してください。他の文字は一切含めないでください：
{"category": "カテゴリーID", "reason": "判定理由（20文字以内の簡潔な日本語）"}`;

// OpenAI未接続時のフォールバック分類ロジック
function fallbackClassify(itemName: string, category: string, memo: string): { category: string; reason: string } {
  const text = `${itemName} ${category} ${memo}`.toLowerCase();

  // メモベースの判定
  if (memo) {
    const memoLower = memo.toLowerCase();
    if (/ストレス|イライラ|疲|むしゃくしゃ|やけ/.test(memoLower)) {
      return { category: 'stress_relief', reason: 'ストレス起因の消費' };
    }
    if (/ご褒美|頑張った|達成|自分へ/.test(memoLower)) {
      return { category: 'reward', reason: '自己肯定のご褒美' };
    }
    if (/sns|映え|見栄|アピール|おしゃれ/.test(memoLower)) {
      return { category: 'vanity', reason: 'SNS・承認欲求' };
    }
    if (/いつも|習慣|なんとなく|ついで/.test(memoLower)) {
      return { category: 'habit', reason: '習慣的な購入' };
    }
    if (/勉強|学習|スキル|健康|キャリア|投資/.test(memoLower)) {
      return { category: 'self_investment', reason: '自己成長のための投資' };
    }
  }

  // カテゴリベースの判定
  switch (category) {
    case 'food':
      if (/コンビニ|カフェ|スタバ|コーヒー/.test(text)) return { category: 'habit', reason: '日常的な食の習慣' };
      if (/飲み|居酒屋|バー/.test(text)) return { category: 'social', reason: '交際費' };
      return { category: 'necessity', reason: '食生活の必要経費' };
    case 'education':
      return { category: 'self_investment', reason: '学習・スキルアップ' };
    case 'healthcare':
      return { category: 'self_investment', reason: '健康への投資' };
    case 'utility':
    case 'housing':
    case 'communication':
      return { category: 'necessity', reason: '固定費・生活必需品' };
    case 'daily_necessities':
      return { category: 'necessity', reason: '日用品の購入' };
    case 'clothing':
      return { category: 'vanity', reason: 'ファッションへの消費' };
    case 'entertainment':
    case 'hobby':
      return { category: 'reward', reason: '趣味・娯楽のご褒美' };
    case 'social':
      return { category: 'vanity', reason: '交際・社交的消費' };
    default:
      return { category: 'habit', reason: '分類不明の消費' };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { item_name, amount, general_category, user_memo } = body;

    if (!item_name || !amount || !general_category) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    const openai = createOpenAIClient();

    // OpenAI APIが利用可能な場合
    if (openai) {
      try {
        const userMessage = `購入品: ${item_name}
金額: ${amount}円
費目: ${general_category}
気持ち・状況: ${user_memo || '特になし'}`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.3,
          max_tokens: 100,
        });

        const content = response.choices[0]?.message?.content?.trim();

        if (content) {
          try {
            const parsed = JSON.parse(content);
            return NextResponse.json({
              ai_psychological_category: parsed.category,
              ai_reason: parsed.reason,
              source: 'openai',
            });
          } catch {
            // JSONパース失敗時はフォールバック
            console.warn('OpenAI response parse failed, using fallback:', content);
          }
        }
      } catch (apiError) {
        console.warn('OpenAI API call failed, using fallback:', apiError);
      }
    }

    // フォールバック: ルールベースの分類
    const result = fallbackClassify(item_name, general_category, user_memo || '');
    return NextResponse.json({
      ai_psychological_category: result.category,
      ai_reason: result.reason,
      source: 'fallback',
    });
  } catch (err) {
    console.error('Classify API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
