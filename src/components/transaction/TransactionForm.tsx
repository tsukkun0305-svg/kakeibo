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

  const handleSaveBackground = async () => {
    if (!formData.amount || formData.amount <= 0) {
      setError('金額を入力してください');
      return;
    }
    setError('');
    setSaving(true);
    
    // DBのカラム制約（item_nameが必須など）に対応するため、未入力時はカテゴリ名やメモを代入します
    const effectiveItemName = formData.item_name || formData.user_memo || GENERAL_CATEGORIES[formData.general_category];
    const submitData = { ...formData, item_name: effectiveItemName };

    try {
      // 1. まずトランザクションをAI分析前（null）として高速にDBに保存する
      const txRes = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...submitData,
          amount: Number(submitData.amount),
          ai_psychological_category: null,
          ai_reason: null,
        }),
      });

      if (!txRes.ok) {
        const data = await txRes.json();
        throw new Error(data.error || '保存に失敗しました');
      }

      const { transaction } = await txRes.json();

      // 2. 分析・DB更新APIをバックグラウンド（非同期）で走らせる
      fetch('/api/ai/background-classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: transaction.id,
          itemName: submitData.item_name,
          amount: submitData.amount,
          generalCategory: submitData.general_category,
          userMemo: submitData.user_memo,
        }),
      }).catch(err => console.error('Background AI trigger error:', err));

      // 3. 即座に完了処理へ
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : '保存に失敗しました');
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

        {/* 入力フォーム本体 */}
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
                onClick={handleSaveBackground}
                disabled={!formData.amount || formData.amount <= 0 || saving}
                className={`flex h-16 w-full gap-2 items-center justify-center rounded-full text-xl font-bold transition-all duration-300 ${
                  !formData.amount || formData.amount <= 0 || saving
                    ? 'bg-muted text-muted-foreground opacity-50'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1'
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    保存処理中...
                  </>
                ) : (
                  <>
                    <Check className="h-6 w-6" />
                    記録する
                  </>
                )}
              </Button>
            </div>
          </div>
      </div>
    </div>
  );
}
