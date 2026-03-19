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
    <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">
              Math<span className="text-blue-500">Arena</span>
            </span>
          </Link>

          <div className="flex items-center gap-6">
            {!loading && (
              <>
                {user ? (
                  <>
                    <Link href="/play" className="text-gray-300 hover:text-white transition-colors">
                      Play
                    </Link>
                    <Link href="/practice" className="text-gray-300 hover:text-white transition-colors">
                      Practice
                    </Link>
                    <Link href="/lessons" className="text-gray-300 hover:text-white transition-colors">
                      Lessons
                    </Link>
                    <Link href="/leaderboard" className="text-gray-300 hover:text-white transition-colors">
                      Rankings
                    </Link>
                    <Link href="/profile" className="text-gray-300 hover:text-white transition-colors">
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/leaderboard" className="text-gray-300 hover:text-white transition-colors">
                      Rankings
                    </Link>
                    <Link
                      href="/login"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                    >
                      Sign In
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
