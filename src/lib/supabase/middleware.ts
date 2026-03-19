import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // sessionの取得により、必要に応じてトークンのリフレッシュが行われcookieにセットされる
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 認証必須のルート
  const isProtectedPath = !request.nextUrl.pathname.startsWith('/login')
       && !request.nextUrl.pathname.startsWith('/auth')
       && !request.nextUrl.pathname.match(/\.(.*)$/); // api, static files等は一部除外が必要だが、今は最低限

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/_next') &&
    !request.nextUrl.pathname.startsWith('/api') && // APIはAPI側でエラーハンドリングする
    request.nextUrl.pathname !== '/login'
  ) {
    // 未ログインかつログインページ以外ならリダイレクト
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // ログイン済みでログインページを表示しようとしたらトップへ
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
