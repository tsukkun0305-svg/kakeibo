'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, Clock, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'ホーム', icon: Home },
  { href: '/analysis', label: '分析', icon: BarChart3 },
  { href: '/history', label: '履歴', icon: Clock },
  { href: '/settings', label: '設定', icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-[68px] max-w-md items-center justify-around px-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={`relative flex flex-1 flex-col items-center justify-center h-full gap-1 transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-emerald-500'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon
                className={`h-6 w-6 transition-transform duration-200 ${
                  isActive ? 'scale-110 drop-shadow-sm' : ''
                }`}
              />
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {label}
              </span>
              {isActive && (
                <div className="absolute top-0 h-0.5 w-8 rounded-b-full bg-emerald-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
