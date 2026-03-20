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
import { Slider } from '@/components/ui/slider';
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
    if (!formData.amount || formData.amount <= 0) {
      setError('金額を入力してください');
      return;
    }
    setError('');
    
    // DBのカラム制約（item_nameが必須など）に対応するため、未入力時はカテゴリ名やメモを代入します
    const effectiveItemName = formData.item_name || formData.user_memo || GENERAL_CATEGORIES[formData.general_category];
    const submitData = { ...formData, item_name: effectiveItemName };

    setStep('analyzing');

    try {
      const res = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
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
          item_name: formData.item_name || formData.user_memo || GENERAL_CATEGORIES[formData.general_category],
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
      <div className="relative w-full max-w-md rounded-[32px] sm:rounded-[36px] bg-background p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 mx-2 mb-2 sm:mb-0">
        {/* ヘッダー */}
        <div className="mb-8 flex items-center justify-center relative">
          <Button 
            variant="outline" 
            size="icon" 
            className="absolute left-0 h-10 w-10 rounded-full border-border/50 bg-background/50 hover:bg-muted" 
            onClick={onClose}
          >
            <X className="h-5 w-5 text-cyan-600" />
          </Button>
          <h2 className="text-lg font-bold">
            {step === 'input' && '使ったお金を記録'}
            {step === 'analyzing' && 'AI分析中...'}
            {step === 'result' && '分析結果'}
          </h2>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* STEP 1: 入力フォーム */}
        {step === 'input' && (
          <div className="space-y-6">
            {/* 特大金額入力 */}
            <div className="flex flex-col items-center">
              <div className="relative flex w-full items-center justify-center border-b border-border/40 pb-4">
                <span className="absolute left-0 text-4xl font-semibold text-muted-foreground/60">¥</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="h-20 w-full border-none bg-transparent p-0 text-right text-[64px] font-black tracking-tighter shadow-none focus-visible:ring-0 outline-none"
                />
              </div>
            </div>

            {/* スライダー */}
            <div className="px-1">
              <Slider
                value={[formData.amount || 0]}
                max={10000}
                step={10}
                onValueChange={(vals) => {
                  const val = Array.isArray(vals) ? vals[0] : vals;
                  if (typeof val === 'number') {
                    setFormData({ ...formData, amount: val });
                  }
                }}
                className="py-4"
              />
            </div>

            {/* クイック入力ボタン */}
            <div className="flex gap-3">
              {[10, 50, 100, 500].map((val) => (
                <Button
                  key={val}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, amount: (prev.amount || 0) + val }))}
                  className="flex-1 rounded-full bg-[#E5F7F8] text-[#1E8B8E] hover:bg-[#D5EZEF] font-bold h-12 text-lg shadow-sm"
                >
                  +{val}
                </Button>
              ))}
            </div>

            {/* iOS風リスト型入力欄 */}
            <div className="mt-8 rounded-3xl border border-border/40 bg-card/60 px-5 shadow-sm">
              
              {/* カテゴリ */}
              <div className="flex items-center justify-between border-b border-border/40 py-4">
                <span className="text-base font-medium">カテゴリ</span>
                <Select
                  value={formData.general_category}
                  onValueChange={(v) => setFormData({ ...formData, general_category: v as GeneralCategory })}
                >
                  <SelectTrigger className="h-auto border-none bg-transparent p-0 text-right text-base focus:ring-0 flex-row-reverse gap-2 font-semibold shadow-none text-[#E87B57] hover:bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {Object.entries(GENERAL_CATEGORIES).map(([key, label]) => (
                      <SelectItem key={key} value={key} className="rounded-xl">
                        <div className="flex items-center gap-2">
                          {key === 'food' && '🍴 '}
                          {key === 'daily' && '🛒 '}
                          {key === 'hobby' && '🎮 '}
                          {key === 'social' && '🥂 '}
                          {key === 'transport' && '🚃 '}
                          {key === 'other' && '📦 '}
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 日付 */}
              <div className="flex items-center justify-between border-b border-border/40 py-4">
                <span className="text-base font-medium">使った日</span>
                <div className="flex flex-1 items-center justify-end overflow-hidden pl-4">
                  <Input
                    type="date"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    className="h-auto w-auto border-none bg-transparent p-0 text-right text-base focus-visible:ring-0 outline-none shadow-none text-muted-foreground font-medium"
                  />
                </div>
              </div>

              {/* メモ（もとの品名入力を統合） */}
              <div className="py-4">
                <Label htmlFor="memo" className="sr-only">メモ (任意)</Label>
                <Input
                  id="memo"
                  placeholder="メモ または 品名 (任意)"
                  value={formData.user_memo}
                  onChange={(e) => setFormData({ ...formData, user_memo: e.target.value })}
                  className="h-auto border-none bg-transparent p-0 text-base focus-visible:ring-0 outline-none shadow-none text-muted-foreground placeholder:text-muted-foreground/40 font-medium w-full"
                />
                <p className="mt-2 text-[10px] text-muted-foreground/60 leading-tight">
                  💡 買ったものや「つい…」などの気持ちを書くと、AIがより正確に分析します
                </p>
              </div>
            </div>

            {/* 保存ボタン */}
            <div className="pt-8">
              <Button
                onClick={handleAnalyze}
                disabled={!formData.amount || formData.amount <= 0}
                className={`h-16 w-full rounded-full text-xl font-bold transition-all duration-300 ${
                  !formData.amount || formData.amount <= 0
                    ? 'bg-muted text-muted-foreground opacity-50'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1'
                }`}
              >
                保存
              </Button>
            </div>
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
