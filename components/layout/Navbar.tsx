'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ChallengeModal } from '@/components/challenge/ChallengeModal';
import { Dropdown } from '@/components/ui/Dropdown';
import { ThemeSettings } from '@/components/layout/ThemeSettings';
import { SearchButton } from '@/components/layout/SearchButton';
import { FriendRequestBadge } from '@/components/layout/FriendRequestBadge';
import { UserSearchModal } from '@/components/search/UserSearchModal';
import { useFriendships } from '@/hooks/useFriendships';

// ─── Nav structure ────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'PLAY',
    items: [
      { name: 'Quick Match', href: '/play' },
      { name: 'Daily Puzzle', href: '/daily' },
    ],
  },
  {
    label: 'LEARN',
    items: [
      { name: 'Practice', href: '/practice' },
      { name: 'Lessons', href: '/lessons' },
    ],
  },
] as const;

// ─── Shared styles ────────────────────────────────────────
const triggerClass =
  'text-[12px] tracking-[2px] font-bold text-ink-tertiary hover:text-ink transition-colors select-none';

const dropdownItemClass =
  'block px-4 py-2.5 text-[11px] text-ink-secondary hover:text-ink hover:bg-tint transition-colors';

// ─── Component ────────────────────────────────────────────
export function Navbar() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { unread_count } = useFriendships();
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  // Fetch profile username
  useEffect(() => {
    if (!user) return;

    const fetchUsername = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .single();

      if (data) {
        setUsername(data.display_name || data.username);
      }
    };

    fetchUsername();
  }, [user]);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const avatarInitial = username?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <>
      <nav className="border-b border-edge-faint bg-chrome backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* ── Logo ─────────────────────────────────── */}
            <Link href="/" className="flex items-center">
              <span className="font-serif text-lg font-black text-ink tracking-[1.5px] leading-none">
                MATH<span className="font-medium text-ink-tertiary">ARENA</span>
              </span>
            </Link>

            {/* ── Desktop nav (md+) ────────────────────── */}
            <div className="hidden md:flex items-center gap-6">
              {!loading && (
                <>
                  {user ? (
                    <>
                      {/* Dropdown groups */}
                      {NAV_GROUPS.map((group) => (
                        <Dropdown
                          key={group.label}
                          align="left"
                          trigger={
                            <span className={triggerClass}>
                              {group.label}
                              <svg
                                className="inline-block ml-1 w-2.5 h-2.5 opacity-40"
                                viewBox="0 0 10 6"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M1 1L5 5L9 1"
                                  stroke="currentColor"
                                  strokeWidth="1.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                          }
                        >
                          <div className="py-1">
                            {group.items.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                className={dropdownItemClass}
                              >
                                {item.name}
                              </Link>
                            ))}
                          </div>
                        </Dropdown>
                      ))}

                      {/* Leaderboard */}
                      <Link href="/leaderboard" className={triggerClass}>
                        RANKINGS
                      </Link>

                      {/* Global user search (⌘K) */}
                      <SearchButton onOpen={() => setSearchOpen(true)} />

                      {/* Challenge CTA */}
                      <button
                        onClick={() => setChallengeModalOpen(true)}
                        className="px-4 py-2 bg-accent text-on-accent text-[12px] tracking-[2px] font-black rounded-md hover:bg-accent-muted transition-colors shadow-[0_4px_16px_var(--accent-glow)]"
                      >
                        CHALLENGE
                      </button>

                      {/* Theme settings */}
                      <ThemeSettings />

                      {/* Profile dropdown */}
                      <Dropdown
                        align="right"
                        trigger={
                          <div className="flex items-center gap-2 cursor-pointer group">
                            <FriendRequestBadge count={unread_count}>
                              <div className="w-7 h-7 rounded-full border border-edge-strong flex items-center justify-center text-[11px] text-ink-secondary group-hover:border-edge-strong transition-colors">
                                {avatarInitial}
                              </div>
                            </FriendRequestBadge>
                            {username && (
                              <span className="text-[11px] text-ink-tertiary group-hover:text-ink-secondary transition-colors hidden lg:inline">
                                {username}
                              </span>
                            )}
                          </div>
                        }
                      >
                        <div className="py-1">
                          <Link href="/profile" className={dropdownItemClass}>
                            Profile
                          </Link>
                          <button
                            onClick={handleLogout}
                            className={`${dropdownItemClass} w-full text-left text-ink-muted hover:text-red-400/80`}
                          >
                            Sign Out
                          </button>
                        </div>
                      </Dropdown>
                    </>
                  ) : (
                    <>
                      <ThemeSettings />
                      <Link
                        href="/login"
                        className="px-5 py-2 bg-accent text-on-accent rounded-md text-[12px] tracking-[2px] font-black hover:bg-accent/90 transition-colors shadow-[0_4px_20px_var(--accent-glow)]"
                      >
                        SIGN IN
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>

            {/* ── Mobile controls (below md) ───────────── */}
            <div className="flex md:hidden items-center gap-3">
              {!loading && user && (
                <>
                  {/* Global user search */}
                  <SearchButton onOpen={() => setSearchOpen(true)} />

                  {/* Challenge CTA — always visible on mobile */}
                  <button
                    onClick={() => setChallengeModalOpen(true)}
                    className="px-3.5 py-1.5 bg-accent text-on-accent text-[11px] tracking-[2px] font-black rounded-md hover:bg-accent-muted transition-colors"
                  >
                    CHALLENGE
                  </button>

                  {/* Hamburger (with friend-request badge overlay) */}
                  <FriendRequestBadge count={unread_count}>
                    <button
                      onClick={() => setMobileMenuOpen(true)}
                      className="p-1.5 text-ink-tertiary hover:text-ink-secondary transition-colors"
                      aria-label="Open menu"
                    >
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M3 5H17" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        <path d="M3 10H17" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        <path d="M3 15H17" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                    </button>
                  </FriendRequestBadge>
                </>
              )}

              {!loading && !user && (
                <Link
                  href="/login"
                  className="px-4 py-2 bg-accent text-on-accent rounded-md text-[12px] tracking-[2px] font-black hover:bg-accent/90 transition-colors shadow-[0_4px_16px_var(--accent-glow)]"
                >
                  SIGN IN
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile slide-in panel ────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-scrim backdrop-blur-sm z-50 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-panel border-l border-edge z-50 md:hidden flex flex-col"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 h-14 border-b border-edge">
                {user && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full border border-edge-strong flex items-center justify-center text-[11px] text-ink-secondary">
                      {avatarInitial}
                    </div>
                    <span className="text-[12px] text-ink-secondary">
                      {username ?? user.email}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-ink-tertiary hover:text-ink-secondary transition-colors"
                  aria-label="Close menu"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M5 5L15 15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M15 5L5 15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Nav groups */}
              <div className="flex-1 overflow-y-auto py-4 px-2">
                {NAV_GROUPS.map((group) => (
                  <div key={group.label} className="mb-5">
                    <div className="px-3 mb-1.5 text-[11px] tracking-[2px] text-ink-faint uppercase">
                      {group.label}
                    </div>
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-3 py-2.5 text-[13px] text-ink-secondary hover:text-ink hover:bg-tint rounded-sm transition-colors"
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                ))}

                {/* Leaderboard */}
                <div className="mb-5">
                  <Link
                    href="/leaderboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2.5 text-[13px] text-ink-secondary hover:text-ink hover:bg-tint rounded-sm transition-colors"
                  >
                    Rankings
                  </Link>
                </div>

                {/* Profile link */}
                <div className="mb-5">
                  <div className="px-3 mb-1.5 text-[11px] tracking-[2px] text-ink-faint uppercase">
                    ACCOUNT
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2.5 text-[13px] text-ink-secondary hover:text-ink hover:bg-tint rounded-sm transition-colors"
                  >
                    Profile
                  </Link>
                </div>
              </div>

              {/* Sign out at bottom */}
              <div className="border-t border-edge px-2 py-3">
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2.5 text-left text-[13px] text-ink-muted hover:text-red-400/80 hover:bg-tint rounded-sm transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ChallengeModal
        isOpen={challengeModalOpen}
        onClose={() => setChallengeModalOpen(false)}
      />

      <UserSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}
