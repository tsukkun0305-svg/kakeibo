'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, X, Check, Trash2, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import imageCompression from 'browser-image-compression';

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
      // すべての画像を圧縮し、Base64に変換
      const compressedImages = await Promise.all(
        files.map(async (file) => {
          const options = {
            maxSizeMB: 0.8, // 1枚あたり800KB程度に抑制 (Vercelの4.5MB制限対策)
            maxWidthOrHeight: 1600,
            useWebWorker: true,
          };
          const compressedFile = await imageCompression(file, options);
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(compressedFile);
          });
        })
      );

      // API呼び出し
      const res = await fetch('/api/ai/analyze-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: compressedImages }),
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

  const handleUpdate = (id: string, field: keyof ScannedTransaction, value: any) => {
    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, [field]: value } : t
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
      // 並列で保存を実行（高速化とタイムアウト対策）
      await Promise.all(
        selectedOnes.map(async (item) => {
          // 金額のクレンジング（カンマや¥マークを除去して数値化）
          const cleanAmount = typeof item.amount === 'string' 
            ? parseInt((item.amount as string).replace(/[^0-9]/g, '')) || 0
            : item.amount;

          const res = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transaction_date: item.date,
              item_name: item.item_name,
              amount: cleanAmount,
              general_category: 'other',
            }),
          });

          if (res.ok) {
            // 一括登録時は個別のAI自動分類（心理分析）をスキップするように変更
            // ユーザーの要望により、画像からの登録はシンプルにDB保存のみ行う
          } else {
            const errData = await res.json();
            console.error('Save failed for item:', item.item_name, errData);
          }
        })
      );
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Bulk save error:', err);
      alert('保存中にエラーが発生しました。一部の項目が保存されていない可能性があります。');
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
              <p className="text-emerald-600 font-medium">画像を圧縮・解析中...</p>
              <p className="text-xs text-gray-400 mt-2">複数枚の場合は30秒ほどかかる場合があります</p>
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
                  className={`flex items-start gap-4 px-5 py-4 transition-colors ${tx.selected ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <button 
                    onClick={() => handleUpdate(tx.id, 'selected', !tx.selected)}
                    className={`mt-1.5 h-6 w-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                      tx.selected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300'
                    }`}
                  >
                    {tx.selected && <Check className="h-4 w-4" />}
                  </button>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={tx.item_name}
                        onChange={(e) => handleUpdate(tx.id, 'item_name', e.target.value)}
                        className="h-8 text-sm font-semibold bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-emerald-500 rounded-none px-0 shadow-none focus-visible:ring-0"
                      />
                      <div className="flex items-center text-sm font-bold text-gray-900 border-b border-transparent">
                        <span className="mr-1">¥</span>
                        <input
                          type="number"
                          value={tx.amount}
                          onChange={(e) => handleUpdate(tx.id, 'amount', parseInt(e.target.value) || 0)}
                          className="w-20 bg-transparent border-0 focus:outline-none text-right"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="date"
                        value={tx.date}
                        onChange={(e) => handleUpdate(tx.id, 'date', e.target.value)}
                        className="text-[10px] text-gray-400 font-mono bg-transparent border-0 focus:outline-none"
                      />
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="mt-1 text-gray-300 hover:text-red-500"
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
