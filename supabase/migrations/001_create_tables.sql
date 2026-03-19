-- ===================================================
-- MindWallet: Users & Transactions テーブル定義
-- ===================================================

-- UUID拡張を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== Users テーブル =====
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  monthly_budget INTEGER NOT NULL DEFAULT 200000,
  billing_start_day INTEGER NOT NULL DEFAULT 25 CHECK (billing_start_day >= 1 AND billing_start_day <= 31),
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'premium', 'coaching')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== Transactions テーブル =====
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  item_name TEXT NOT NULL,
  general_category TEXT NOT NULL DEFAULT 'other',
  user_memo TEXT DEFAULT '',
  ai_psychological_category TEXT,
  ai_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== インデックス =====
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date);

-- ===== 開発用: デフォルトユーザーの作成 =====
INSERT INTO users (id, email, monthly_budget, billing_start_day, plan_type)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo@mindwallet.app',
  200000,
  25,
  'free'
) ON CONFLICT (id) DO NOTHING;
