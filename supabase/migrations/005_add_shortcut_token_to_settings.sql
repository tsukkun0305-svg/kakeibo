-- shortcut_token カラムを追加
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS shortcut_token UUID DEFAULT gen_random_uuid();

-- 既存のトークンがない場合は生成する（既存ユーザー対応）
UPDATE public.users SET shortcut_token = gen_random_uuid() WHERE shortcut_token IS NULL;

-- トークンを一意にするためユニーク制約を付与
ALTER TABLE public.users ADD CONSTRAINT unique_shortcut_token UNIQUE (shortcut_token);
