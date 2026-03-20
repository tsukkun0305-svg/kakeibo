import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API Key is not configured' }, { status: 500 });
  }

  try {
    const { image } = await request.json(); // base64 image data

    if (!image) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
    }

    // Base64からデータ部分のみ抽出
    const base64Data = image.split(',')[1] || image;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `この画像はクレジットカードの利用明細（スクリーンショット）です。
画像から「日付」「品名（店舗名）」「金額」のリストをすべて抽出してください。

【ルール】
- 日付は可能であれば YYYY-MM-DD 形式に変換してください（年が不明な場合は今年の年を補完してください）。
- 金額はカンマを除いた数値のみにしてください。
- 品名はできるだけ正確に抽出してください。
- 出力は必ず以下のJSONフォーマットのみとしてください。

{
  "transactions": [
    { "date": "2024-03-20", "item_name": "スターバックス", "amount": 550 },
    ...
  ]
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/png" // 暫定的にPNG
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    // JSON部分をパース（念のためコードブロック等を除去）
    const jsonStr = text.replace(/```json|```/g, '').trim();
    const data = JSON.parse(jsonStr);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Statement analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze image: ' + error.message }, { status: 500 });
  }
}
