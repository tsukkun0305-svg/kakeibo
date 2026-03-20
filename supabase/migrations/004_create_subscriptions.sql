-- ===================================================
-- 004: サブスクリプション（固定費）テーブル定義とRLS
-- ===================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  billing_day INTEGER NOT NULL CHECK (billing_day >= 1 AND billing_day <= 31),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

-- RLS（Row Level Security）の有効化
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 本番用ポリシー：自分のサブスクのみ読み書き・削除可能
CREATE POLICY "Users can manage own subscriptions" 
  ON public.subscriptions
  FOR ALL 
  USING (auth.uid() = user_id);

-- ※同月内の重複作成を防ぐため、transactionsテーブルに
-- どのsubscription_idから生成されたかを示すカラムを追加します
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS source_subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL;

-- AI分類の理由をシステム入力に対応させるため（オプション）
COMMENT ON COLUMN public.transactions.source_subscription_id IS '固定費・サブスクの自動生成元ID';
