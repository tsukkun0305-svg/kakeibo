'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, Info, Loader2 } from 'lucide-react';
import SubscriptionManager from '@/components/settings/SubscriptionManager';

export default function SettingsPage() {
  const [budget, setBudget] = useState(200000);
  const [billingDay, setBillingDay] = useState(25);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/user/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setBudget(data.settings.monthly_budget);
            setBillingDay(data.settings.billing_start_day);
          }
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monthly_budget: budget,
          billing_start_day: billingDay,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert('保存に失敗しました。締め日が1〜28の範囲内かご確認ください。');
      }
    } catch (err) {
      console.error(err);
      alert('通信エラーが発生しました。');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 予算設定 */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">💰 予算設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="monthly-budget" className="text-xs text-muted-foreground">
              月間予算（円）
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">¥</span>
              <Input
                id="monthly-budget"
                type="number"
                className="pl-7 text-lg font-bold"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="billing-day" className="text-xs text-muted-foreground">
              締め日（毎月何日）
            </Label>
            <Input
              id="billing-day"
              type="number"
              min={1}
              max={28}
              className="mt-1"
              value={billingDay}
              onChange={(e) => setBillingDay(Number(e.target.value))}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              ※ 1〜28日の範囲で設定してください
            </p>
          </div>
        </CardContent>
      </Card>


      {/* サブスクリプション管理 */}
      <SubscriptionManager />

      {/* プラン情報 */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">📋 プラン情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">現在のプラン</p>
              <p className="text-xs text-muted-foreground">ベーシック機能をご利用いただけます</p>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-500 border-0">Free</Badge>
          </div>
        </CardContent>
      </Card>

      {/* 保存ボタン */}
      <Button
        onClick={handleSave}
        disabled={saving || saved}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 font-semibold text-white hover:from-emerald-600 hover:to-teal-700"
        size="lg"
      >
        {saving ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 保存中...</>
        ) : saved ? (
          <>✓ 保存しました</>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            設定を保存
          </>
        )}
      </Button>

      {/* バージョン情報 */}
      <div className="pb-4 text-center">
        <p className="text-[10px] text-muted-foreground">MindWallet v0.1.0</p>
      </div>
    </div>
  );
}
