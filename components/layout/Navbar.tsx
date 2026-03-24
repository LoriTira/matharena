'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ChallengeModal } from '@/components/challenge/ChallengeModal';
import { Dropdown } from '@/components/ui/Dropdown';

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
  {
    label: 'SOCIAL',
    items: [
      { name: 'Leaderboard', href: '/leaderboard' },
    ],
  },
] as const;

// ─── Shared styles ────────────────────────────────────────
const triggerClass =
  'text-[10px] tracking-[1.5px] text-white/25 hover:text-white/70 transition-colors select-none';

const dropdownItemClass =
  'block px-4 py-2.5 text-[11px] text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors';

// ─── Component ────────────────────────────────────────────
export function Navbar() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      <nav className="border-b border-white/[0.04] bg-[#050505]/85 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* ── Logo ─────────────────────────────────── */}
            <Link href={user ? '/dashboard' : '/'} className="flex items-center">
              <span className="font-serif text-base font-bold text-white/90 tracking-[1px]">
                MATH<span className="font-light text-white/35">ARENA</span>
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

                      {/* Challenge CTA */}
                      <button
                        onClick={() => setChallengeModalOpen(true)}
                        className="px-3.5 py-1.5 bg-amber-500 text-[#050505] text-[10px] tracking-[1.5px] font-semibold rounded-sm hover:bg-amber-400 transition-colors"
                      >
                        CHALLENGE
                      </button>

                      {/* Profile dropdown */}
                      <Dropdown
                        align="right"
                        trigger={
                          <div className="flex items-center gap-2 cursor-pointer group">
                            <div className="w-7 h-7 rounded-full border border-white/[0.12] flex items-center justify-center text-[11px] text-white/50 group-hover:border-white/25 transition-colors">
                              {avatarInitial}
                            </div>
                            {username && (
                              <span className="text-[11px] text-white/40 group-hover:text-white/70 transition-colors hidden lg:inline">
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
                            className={`${dropdownItemClass} w-full text-left text-white/30 hover:text-red-400/80`}
                          >
                            Sign Out
                          </button>
                        </div>
                      </Dropdown>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/leaderboard"
                        className="text-[10px] tracking-[1.5px] text-white/25 hover:text-white/70 transition-colors"
                      >
                        RANKINGS
                      </Link>
                      <Link
                        href="/login"
                        className="px-4 py-1.5 border border-white/[0.15] rounded-sm text-[10px] tracking-[1.5px] text-white/60 hover:text-white/90 hover:border-white/25 transition-colors"
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
                  {/* Challenge CTA — always visible on mobile */}
                  <button
                    onClick={() => setChallengeModalOpen(true)}
                    className="px-3 py-1.5 bg-amber-500 text-[#050505] text-[10px] tracking-[1.5px] font-semibold rounded-sm hover:bg-amber-400 transition-colors"
                  >
                    CHALLENGE
                  </button>

                  {/* Hamburger */}
                  <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="p-1.5 text-white/40 hover:text-white/70 transition-colors"
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
                </>
              )}

              {!loading && !user && (
                <Link
                  href="/login"
                  className="px-4 py-1.5 border border-white/[0.15] rounded-sm text-[10px] tracking-[1.5px] text-white/60 hover:text-white/90 hover:border-white/25 transition-colors"
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-[#0a0a0a] border-l border-white/[0.06] z-50 md:hidden flex flex-col"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 h-14 border-b border-white/[0.06]">
                {user && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full border border-white/[0.12] flex items-center justify-center text-[11px] text-white/50">
                      {avatarInitial}
                    </div>
                    <span className="text-[12px] text-white/60">
                      {username ?? user.email}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-white/40 hover:text-white/70 transition-colors"
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
                    <div className="px-3 mb-1.5 text-[9px] tracking-[2px] text-white/20 uppercase">
                      {group.label}
                    </div>
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-3 py-2.5 text-[13px] text-white/50 hover:text-white/80 hover:bg-white/[0.04] rounded-sm transition-colors"
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                ))}

                {/* Profile link */}
                <div className="mb-5">
                  <div className="px-3 mb-1.5 text-[9px] tracking-[2px] text-white/20 uppercase">
                    ACCOUNT
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2.5 text-[13px] text-white/50 hover:text-white/80 hover:bg-white/[0.04] rounded-sm transition-colors"
                  >
                    Profile
                  </Link>
                </div>
              </div>

              {/* Sign out at bottom */}
              <div className="border-t border-white/[0.06] px-2 py-3">
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2.5 text-left text-[13px] text-white/30 hover:text-red-400/80 hover:bg-white/[0.04] rounded-sm transition-colors"
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
    </>
  );
}
