'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="border-b border-white/[0.04] bg-[#050505]/85 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href={user ? '/dashboard' : '/'} className="flex items-center">
            <span className="font-serif text-base font-bold text-white/90 tracking-[1px]">
              MATH<span className="font-light text-white/35">ARENA</span>
            </span>
          </Link>

          <div className="flex items-center gap-6">
            {!loading && (
              <>
                {user ? (
                  <>
                    <Link href="/play" className="text-[10px] tracking-[1.5px] text-white/25 hover:text-white/70 transition-colors">
                      PLAY
                    </Link>
                    <Link href="/practice" className="text-[10px] tracking-[1.5px] text-white/25 hover:text-white/70 transition-colors">
                      PRACTICE
                    </Link>
                    <Link href="/lessons" className="text-[10px] tracking-[1.5px] text-white/25 hover:text-white/70 transition-colors">
                      LESSONS
                    </Link>
                    <Link href="/leaderboard" className="text-[10px] tracking-[1.5px] text-white/25 hover:text-white/70 transition-colors">
                      RANKINGS
                    </Link>
                    <Link
                      href="/profile"
                      className="w-7 h-7 rounded-full border border-white/[0.12] flex items-center justify-center text-[11px] text-white/50 hover:border-white/25 transition-colors"
                    >
                      {user.email?.[0]?.toUpperCase() ?? 'U'}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="text-[10px] tracking-[1.5px] text-white/20 hover:text-white/50 transition-colors"
                    >
                      SIGN OUT
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/leaderboard" className="text-[10px] tracking-[1.5px] text-white/25 hover:text-white/70 transition-colors">
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
        </div>
      </div>
    </nav>
  );
}
