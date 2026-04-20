'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useFriendships } from '@/hooks/useFriendships';
import { createClient } from '@/lib/supabase/client';
import { Dropdown } from '@/components/ui/Dropdown';
import { ThemeSettings } from '@/components/layout/ThemeSettings';
import { SearchButton } from '@/components/layout/SearchButton';
import { UserSearchModal } from '@/components/search/UserSearchModal';

interface NavItem {
  label: string;
  href: string;
  /** Extra pathname prefixes that should also mark this item active. */
  matchAny?: string[];
}

const ITEMS: NavItem[] = [
  { label: 'Play',     href: '/play',        matchAny: ['/dashboard', '/play'] },
  { label: 'Practice', href: '/practice' },
  { label: 'Lessons',  href: '/lessons' },
  { label: 'Daily',    href: '/daily' },
  { label: 'Ranks',    href: '/leaderboard' },
];

function isActive(pathname: string, item: NavItem) {
  const prefixes = item.matchAny ?? [item.href];
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function Nav() {
  const { user, loading } = useAuth();
  const { unread_count } = useFriendships();
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const supabase = useMemo(() => createClient(), []);
  const [username, setUsername] = useState<string | null>(null);
  const [elo, setElo] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, display_name, elo_rating')
        .eq('id', user.id)
        .single();
      if (data) {
        setUsername((data.display_name || data.username) as string);
        setElo((data.elo_rating as number) ?? null);
      }
    })();
  }, [user, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMobileOpen(false);
    router.push('/');
    router.refresh();
  };

  const avatarInitial = (username?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase();

  return (
    <>
      <nav className="relative z-40 border-b border-edge bg-chrome backdrop-blur-[10px]">
        <div className="max-w-7xl mx-auto px-5 md:px-12 flex items-center justify-between h-14 md:h-[66px]">
          {/* Logo */}
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-[10px] min-w-0">
            <span
              className="grid place-items-center font-mono font-bold text-[14px] text-[#0a0612]"
              style={{
                width: 28,
                height: 28,
                background: 'var(--neon-magenta)',
                boxShadow: '0 0 18px var(--neon-magenta), inset 0 0 0 2px rgba(0,0,0,0.15)',
              }}
              aria-hidden
            >
              ∑
            </span>
            <span className="font-display font-bold text-[17px] tracking-[-0.3px]">
              MATHS<span className="text-cyan">ARENA</span>
            </span>
          </Link>

          {/* Desktop — flat 5 items */}
          <div className="hidden md:flex items-center gap-[28px] font-mono text-[12px] uppercase tracking-[1px]">
            {ITEMS.map((it) => (
              <Link
                key={it.label}
                href={it.href}
                className={`pb-[3px] border-b transition-colors ${
                  isActive(pathname, it)
                    ? 'text-ink border-magenta'
                    : 'text-ink-tertiary border-transparent hover:text-ink'
                }`}
              >
                {it.label}
              </Link>
            ))}
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-[10px]">
            {!loading && user && (
              <>
                {/* Elo chip (desktop) */}
                {elo !== null && (
                  <div className="hidden lg:flex items-center gap-[8px] px-[10px] py-[4px] border border-edge font-mono text-[11px]">
                    <span className="text-ink-tertiary uppercase tracking-[1.2px]">Elo</span>
                    <span className="text-cyan font-bold">{elo}</span>
                  </div>
                )}

                {/* Search */}
                <SearchButton onOpen={() => setSearchOpen(true)} />

                {/* Theme settings */}
                <ThemeSettings />

                {/* Avatar */}
                <Dropdown
                  align="right"
                  trigger={
                    <button
                      aria-label="Profile menu"
                      className="relative grid place-items-center font-mono font-bold text-[12px] text-[#0a0612]"
                      style={{
                        width: 32,
                        height: 32,
                        background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-magenta))',
                      }}
                    >
                      {avatarInitial}
                      {unread_count > 0 && (
                        <span
                          className="absolute -top-1 -right-1 block rounded-full"
                          style={{
                            width: 10,
                            height: 10,
                            background: 'var(--neon-magenta)',
                            boxShadow: '0 0 8px var(--neon-magenta)',
                          }}
                          aria-label={`${unread_count} new friend request${unread_count === 1 ? '' : 's'}`}
                        />
                      )}
                    </button>
                  }
                >
                  <div className="p-2 w-48 font-mono text-[11px] uppercase tracking-[1.2px]">
                    <Link
                      href="/profile"
                      className="block px-3 py-2 text-ink-tertiary hover:text-ink hover:bg-tint"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/dashboard"
                      className="block px-3 py-2 text-ink-tertiary hover:text-ink hover:bg-tint"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-ink-tertiary hover:text-magenta hover:bg-tint"
                    >
                      Sign out
                    </button>
                  </div>
                </Dropdown>

                {/* Mobile hamburger */}
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="md:hidden p-1.5 text-ink"
                  aria-label="Toggle menu"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {mobileOpen ? (
                      <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                    ) : (
                      <>
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="6"  x2="21" y2="6" />
                      </>
                    )}
                  </svg>
                </button>
              </>
            )}

            {!loading && !user && (
              <>
                <Link
                  href="/login"
                  className="hidden md:inline-block font-mono text-[11px] uppercase tracking-[1px] text-ink-tertiary hover:text-ink px-[10px] py-[6px]"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="font-mono text-[11px] uppercase tracking-[1.2px] font-bold px-[14px] py-[8px] bg-gold text-[#0a0612] border border-ink"
                  style={{ boxShadow: '3px 3px 0 var(--neon-magenta)' }}
                >
                  Insert Coin
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile drawer — flat item list */}
        {mobileOpen && user && (
          <div className="md:hidden border-t border-edge bg-page">
            <div className="flex flex-col py-2 font-mono text-[12px] uppercase tracking-[1.2px]">
              {ITEMS.map((it) => (
                <Link
                  key={it.label}
                  href={it.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-5 py-3 border-l-2 ${
                    isActive(pathname, it)
                      ? 'text-ink border-magenta bg-panel'
                      : 'text-ink-tertiary border-transparent'
                  }`}
                >
                  {it.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <UserSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
