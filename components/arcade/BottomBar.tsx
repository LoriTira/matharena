'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Item {
  icon: string;
  label: string;
  href: string;
  matchAny?: string[];
}

const ITEMS: Item[] = [
  { icon: '▶', label: 'Play',     href: '/play',        matchAny: ['/dashboard', '/play'] },
  { icon: '◆', label: 'Practice', href: '/practice' },
  { icon: '⚡', label: 'Daily',    href: '/daily' },
  { icon: '☰', label: 'Lessons',  href: '/lessons' },
  { icon: '◎', label: 'You',      href: '/profile',     matchAny: ['/profile', '/leaderboard'] },
];

function isActive(pathname: string, item: Item) {
  const prefixes = item.matchAny ?? [item.href];
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * Mobile-only sticky bottom tab bar. Sits inside the (app) layout so protected
 * routes get primary navigation on phones. Hidden on md+ where the top nav
 * handles it.
 */
export function BottomBar() {
  const pathname = usePathname() ?? '';

  return (
    <nav
      className="md:hidden sticky bottom-0 left-0 right-0 z-40 border-t border-edge-strong bg-chrome backdrop-blur-[12px] grid grid-cols-5 px-2 pt-[10px]"
      style={{ paddingBottom: 'calc(18px + env(safe-area-inset-bottom))' }}
    >
      {ITEMS.map((it) => {
        const active = isActive(pathname, it);
        return (
          <Link
            key={it.label}
            href={it.href}
            className={`flex flex-col items-center gap-[4px] transition-colors ${
              active ? 'text-cyan' : 'text-ink-tertiary hover:text-ink'
            }`}
          >
            <span className="text-[14px]">{it.icon}</span>
            <span className="font-mono text-[9px] uppercase tracking-[1px]">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
