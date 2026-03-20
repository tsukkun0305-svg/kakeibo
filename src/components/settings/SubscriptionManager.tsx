'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Loader2, CalendarHeart } from 'lucide-react';
import { Subscription } from '@/types';

export default function SubscriptionManager() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newBillingDay, setNewBillingDay] = useState('1');

  useEffect(() => {
    fetchSubs();
  }, []);

  const fetchSubs = async () => {
    try {
      const res = await fetch('/api/subscriptions');
      if (res.ok) {
        const data = await res.json();
        setSubs(data.subscriptions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newName || !newAmount || !newBillingDay) return;
    setAdding(true);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          amount: Number(newAmount),
          billing_day: Number(newBillingDay),
        }),
      });
      if (res.ok) {
        setNewName('');
        setNewAmount('');
        setNewBillingDay('1');
        await fetchSubs();
      } else {
        const errorData = await res.json();
        alert(`登録エラー: ${errorData.error || '不明なエラー'}`);
        console.error('Add subscription error:', errorData);
      }
    } catch (err) {
      console.error(err);
      alert('通信エラーが発生しました。');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchSubs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const totalMonthly = subs.reduce((sum, s) => sum + s.amount, 0);

  return (
    <Card className="border-border/40 overflow-hidden">
      <CardHeader className="bg-muted/30 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarHeart className="h-4 w-4 text-emerald-500" />
            固定費・サブスク管理
          </CardTitle>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">月額合計</p>
            <p className="text-sm font-bold text-red-400">¥{totalMonthly.toLocaleString()}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* リスト部分 */}
        <div className="divide-y divide-border/40">
          {subs.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              登録されている固定費はありません。
            </div>
          ) : (
            subs.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between p-4 bg-background">
                <div>
                  <p className="font-semibold text-sm">{sub.name}</p>
                  <p className="text-xs text-muted-foreground">毎月 {sub.billing_day}日</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm">¥{sub.amount.toLocaleString()}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(sub.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 追加フォーム */}
        <div className="bg-muted/10 p-4 border-t border-border/40">
          <p className="text-xs font-semibold mb-3">新しく追加</p>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-5">
              <Label className="sr-only">品名</Label>
              <Input
                placeholder="名称 (例: 家賃)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="text-xs bg-background h-9"
              />
            </div>
            <div className="col-span-4">
              <Label className="sr-only">金額</Label>
              <Input
                type="number"
                placeholder="金額"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="text-xs bg-background h-9"
              />
            </div>
            <div className="col-span-3">
              <Label className="sr-only">請求日</Label>
              <Input
                type="number"
                min="1"
                max="31"
                placeholder="何日"
                value={newBillingDay}
                onChange={(e) => setNewBillingDay(e.target.value)}
                className="text-xs bg-background h-9"
              />
            </div>
            <div className="col-span-12 mt-1">
              <Button
                onClick={handleAdd}
                disabled={adding || !newName || !newAmount || !newBillingDay}
                className="w-full text-xs h-9 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-none border border-emerald-500/20"
              >
                {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                追加する
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
