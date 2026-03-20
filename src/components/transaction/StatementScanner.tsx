'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, X, Check, Trash2, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface ScannedTransaction {
  id: string;
  date: string;
  item_name: string;
  amount: number;
  selected: boolean;
}

interface StatementScannerProps {
  onSuccess: () => void;
  onClose: () => void;
}

export default function StatementScanner({ onSuccess, onClose }: StatementScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [transactions, setTransactions] = useState<ScannedTransaction[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setScanning(true);
    try {
      // すべての画像をBase64に変換
      const base64Promises = files.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });
      const base64Images = await Promise.all(base64Promises);

      // API呼び出し
      const res = await fetch('/api/ai/analyze-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: base64Images }),
      });

      if (!res.ok) throw new Error('解析に失敗しました');

      const data = await res.json();
      const parsed: ScannedTransaction[] = (data.transactions || []).map((t: any, index: number) => ({
        ...t,
        id: `scanned-${index}-${Date.now()}`,
        selected: true,
      }));
      setTransactions(parsed);
    } catch (err) {
      console.error(err);
      alert('画像の解析中にエラーが発生しました。別の画像を試してください。');
    } finally {
      setScanning(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, selected: !t.selected } : t
    ));
  };

  const handleRemove = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleBulkSave = async () => {
    const selectedOnes = transactions.filter(t => t.selected);
    if (selectedOnes.length === 0) return;

    setSaving(true);
    try {
      // 1件ずつ保存（バックグラウンドAI分類も走る）
      for (const item of selectedOnes) {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transaction_date: item.date,
            item_name: item.item_name,
            amount: item.amount,
            general_category: 'other', // 最初はその他で登録
          }),
        });

        if (res.ok) {
          const { transaction } = await res.json();
          // バックグラウンドAI呼び出し（HomePageと同様のフローを再現）
          fetch('/api/ai/background-classify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transactionId: transaction.id,
              itemName: transaction.item_name,
              amount: transaction.amount,
              generalCategory: transaction.general_category,
            }),
          }).catch(console.error);
        }
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('一部の保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg border-0 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <CardHeader className="flex flex-row items-center justify-between border-b px-5 py-4 shrink-0">
          <CardTitle className="text-lg font-bold">🗒 明細スキャン中</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        
        <CardContent className="p-0 overflow-y-auto flex-1">
          {transactions.length === 0 && !scanning ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
              <div className="h-20 w-20 rounded-full bg-emerald-50 flex items-center justify-center">
                <Camera className="h-10 w-10 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">明細を読み取る（複数枚対応）</h3>
                <p className="mt-1 text-sm text-gray-500">
                  クレジットカードの利用明細画面をスクリーンショットし、アップロードしてください（複数枚一括も可能）。
                </p>
              </div>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-emerald-500 text-white hover:bg-emerald-600 rounded-full px-8"
              >
                画像を選択する
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
                multiple
              />
            </div>
          ) : scanning ? (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
              <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mb-4" />
              <p className="text-emerald-600 font-medium">Geminiが画像を解析中...</p>
              <p className="text-xs text-gray-400 mt-2">数秒かかる場合があります</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 italic">
              <div className="bg-emerald-50/50 px-5 py-3 text-xs font-medium text-emerald-700 flex justify-between items-center">
                <span>{transactions.length} 件の支出が見つかりました</span>
                <span>(チェックを入れたものを登録)</span>
              </div>
              {transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className={`flex items-center gap-4 px-5 py-4 transition-colors ${tx.selected ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <button 
                    onClick={() => handleToggleSelect(tx.id)}
                    className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      tx.selected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300'
                    }`}
                  >
                    {tx.selected && <Check className="h-4 w-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <p className="text-sm font-semibold text-gray-900 truncate">{tx.item_name}</p>
                      <p className="text-sm font-bold text-gray-900">¥{tx.amount.toLocaleString()}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 font-mono">{tx.date}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-gray-300 hover:text-red-500"
                    onClick={() => handleRemove(tx.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {transactions.length > 0 && (
          <div className="border-t p-4 bg-gray-50 shrink-0">
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={onClose}
              >
                キャンセル
              </Button>
              <Button 
                disabled={saving || transactions.filter(t => t.selected).length === 0}
                className="flex-[2] bg-emerald-500 text-white hover:bg-emerald-600 font-bold"
                onClick={handleBulkSave}
              >
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 保存中...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> {transactions.filter(t => t.selected).length}件を一括保存</>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
