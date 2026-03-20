import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API Key is not configured' }, { status: 500 });
  }

  try {
    const { images } = await request.json(); // base64 images array

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `これらの画像はすべて、同一または一連のクレジットカード利用明細（スクリーンショット）です。
すべての画像から「日付」「品名（店舗名）」「金額」のリストを重複なくすべて抽出してください。

【ルール】
- 日付は可能であれば YYYY-MM-DD 形式に変換してください。
- 金額は数値のみにしてください。
- 複数の画像にまたがって同じ項目がある場合は、重複させないでください。
- 出力は必ず以下のJSONフォーマットのみとしてください。

{
  "transactions": [
    { "date": "2024-03-20", "item_name": "スターバックス", "amount": 550 },
    ...
  ]
}`;

    // 画像パーツの作成
    const imageParts = images.map(img => {
      const base64Data = img.split(',')[1] || img;
      return {
        inlineData: {
          data: base64Data,
          mimeType: "image/png"
        }
      };
    });

    const result = await model.generateContent([
      prompt,
      ...imageParts
    ]);

    const response = await result.response;
    const text = response.text();
    
    // JSON部分をパース
    const jsonStr = text.replace(/```json|```/g, '').trim();
    const data = JSON.parse(jsonStr);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Statement analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze image: ' + error.message }, { status: 500 });
  }
}
