-- ===================================================
-- 002: Row Level Security (RLS) 本番適用ポリシー
-- ===================================================

-- 1. テスト用の一時的なポリシーを削除
DROP POLICY IF EXISTS "Enable all for users" ON public.users;
DROP POLICY IF EXISTS "Enable all for transactions" ON public.transactions;

-- 2. テーブルのRLSを有効化 (すでに有効な場合も念のため)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 3. Users テーブル用ポリシー
-- (自分のレコードだけ読める・更新できる)
CREATE POLICY "Users can view own data" 
  ON public.users
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data" 
  ON public.users
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" 
  ON public.users
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 4. Transactions テーブル用ポリシー
-- (自分の作成したデータだけ読める・作成・更新・削除できる)
CREATE POLICY "Users can manage own transactions" 
  ON public.transactions
  FOR ALL 
  USING (auth.uid() = user_id);
