'use client';

import { useState } from 'react';
import { X, Loader2, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { GENERAL_CATEGORIES, PSYCHOLOGICAL_CATEGORIES } from '@/lib/constants';
import { GeneralCategory, PsychologicalCategory, TransactionFormData } from '@/types';
import { formatDateToISO } from '@/utils/date';

interface TransactionFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

type FormStep = 'input' | 'analyzing' | 'result';

interface AIResult {
  ai_psychological_category: PsychologicalCategory;
  ai_reason: string;
  source: string;
}

export default function TransactionForm({ onClose, onSuccess }: TransactionFormProps) {
  const [step, setStep] = useState<FormStep>('input');
  const [formData, setFormData] = useState<TransactionFormData>({
    transaction_date: formatDateToISO(new Date()),
    amount: 0,
    item_name: '',
    general_category: 'food',
    user_memo: '',
  });
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!formData.amount || !formData.item_name) {
      setError('金額と品名を入力してください');
      return;
    }
    setError('');
    setStep('analyzing');

    try {
      const res = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('AI分類に失敗しました');

      const data = await res.json();
      setAiResult(data);
      setStep('result');
    } catch (err) {
      console.error('AI classify error:', err);
      setError('AI分析中にエラーが発生しました。もう一度お試しください。');
      setStep('input');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: Number(formData.amount),
          ai_psychological_category: aiResult?.ai_psychological_category || null,
          ai_reason: aiResult?.ai_reason || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '保存に失敗しました');
      }

      onSuccess();
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const psychCategory = aiResult?.ai_psychological_category
    ? PSYCHOLOGICAL_CATEGORIES[aiResult.ai_psychological_category as PsychologicalCategory]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* フォームパネル */}
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-border/40 bg-background p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* ヘッダー */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {step === 'input' && '支出を記録'}
            {step === 'analyzing' && 'AI分析中...'}
            {step === 'result' && '分析結果'}
          </h2>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* STEP 1: 入力フォーム */}
        {step === 'input' && (
          <div className="space-y-4">
            {/* 金額 */}
            <div>
              <Label htmlFor="amount" className="text-xs text-muted-foreground">金額（円）</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">¥</span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="1000"
                  className="pl-7 text-lg font-bold"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* 品名 */}
            <div>
              <Label htmlFor="item_name" className="text-xs text-muted-foreground">買ったもの</Label>
              <Input
                id="item_name"
                placeholder="例: コンビニでコーヒー"
                className="mt-1"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
              />
            </div>

            {/* 日付と費目 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="date" className="text-xs text-muted-foreground">日付</Label>
                <Input
                  id="date"
                  type="date"
                  className="mt-1"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">費目</Label>
                <Select
                  value={formData.general_category}
                  onValueChange={(v) => setFormData({ ...formData, general_category: v as GeneralCategory })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(GENERAL_CATEGORIES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 気持ち・メモ */}
            <div>
              <Label htmlFor="memo" className="text-xs text-muted-foreground">
                その時の気持ち・状況（任意）
              </Label>
              <Textarea
                id="memo"
                placeholder="例: 仕事で疲れてつい..."
                className="mt-1 resize-none"
                rows={2}
                value={formData.user_memo}
                onChange={(e) => setFormData({ ...formData, user_memo: e.target.value })}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                💡 気持ちを書くとAIがより正確に浪費パターンを分析できます
              </p>
            </div>

            {/* 送信ボタン */}
            <Button
              onClick={handleAnalyze}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 font-semibold text-white hover:from-emerald-600 hover:to-teal-700"
              size="lg"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              AIで分析して記録
            </Button>
          </div>
        )}

        {/* STEP 2: 分析中アニメーション */}
        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative mb-6">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 animate-pulse" />
              <Loader2 className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-spin text-emerald-500" />
            </div>
            <p className="text-sm font-medium">あなたの消費心理をAIが分析中...</p>
            <p className="mt-1 text-xs text-muted-foreground">
              「{formData.item_name}」の購入動機を判定しています
            </p>
          </div>
        )}

        {/* STEP 3: 分析結果 */}
        {step === 'result' && aiResult && (
          <div className="space-y-4">
            {/* 分析結果カード */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-500">AI分析結果</span>
                {aiResult.source === 'fallback' && (
                  <Badge variant="outline" className="text-[10px] h-5">ルールベース</Badge>
                )}
              </div>

              {psychCategory && (
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                    style={{ backgroundColor: `${psychCategory.color}15` }}
                  >
                    {psychCategory.emoji}
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: psychCategory.color }}>
                      {psychCategory.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{aiResult.ai_reason}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 入力内容のサマリー */}
            <div className="rounded-xl bg-muted/30 p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">品名</span>
                <span className="font-medium">{formData.item_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">金額</span>
                <span className="font-bold text-red-400">¥{Number(formData.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">費目</span>
                <span>{GENERAL_CATEGORIES[formData.general_category]}</span>
              </div>
              {formData.user_memo && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">メモ</span>
                  <span className="max-w-[60%] truncate text-right">{formData.user_memo}</span>
                </div>
              )}
            </div>

            {/* アクションボタン */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep('input')}>
                修正する
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 font-semibold text-white hover:from-emerald-600 hover:to-teal-700"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {saving ? '保存中...' : '記録する'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
