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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-all duration-200 ${
                isActive
                  ? 'text-emerald-500'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon
                className={`h-5 w-5 transition-transform duration-200 ${
                  isActive ? 'scale-110' : ''
                }`}
              />
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                {label}
              </span>
              {isActive && (
                <div className="absolute -bottom-0 h-0.5 w-6 rounded-full bg-emerald-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
