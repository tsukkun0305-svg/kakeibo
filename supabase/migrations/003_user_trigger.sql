-- ===================================================
-- 003: ユーザー登録時の同期トリガー
-- ===================================================

-- 新規登録時（auth.users）に、アプリ用の users テーブルに初期データをコピーする関数
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, email, monthly_budget, billing_start_day)
  values (new.id, new.email, 200000, 25);
  return new;
end;
$$ language plpgsql security definer;

-- すでに存在している場合は一旦削除（エラー回避）
drop trigger if exists on_auth_user_created on auth.users;

-- トリガーの設定
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- （既存のユーザーにもレコードを作成する補填バッチ）
-- もしすでにSupabase上でユーザーを作成してしまっている場合、この1行でpublic.usersにも追加されます
insert into public.users (id, email)
select id, email from auth.users
on conflict (id) do nothing;
