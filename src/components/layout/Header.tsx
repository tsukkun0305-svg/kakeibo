'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Brain, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return 'ホーム';
      case '/analysis':
        return '分析';
      case '/history':
        return '履歴';
      case '/settings':
        return '設定';
      default:
        return 'MindWallet';
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight">MindWallet</span>
        </Link>
        <div className="flex items-center gap-3">
          {user && (
            <>
              <span className="max-w-[100px] truncate text-[10px] text-muted-foreground">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 bg-card/50 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="ログアウト"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
