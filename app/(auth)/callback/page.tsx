'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CallbackPage() {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('Auth callback error:', error.message);
          setError(true);
          return;
        }
      }

      // Determine redirect destination: sessionStorage > cookie > URL param > dashboard
      let next = '/dashboard';

      try {
        const pending = sessionStorage.getItem('ma-pending-redirect');
        if (pending && pending.startsWith('/') && !pending.startsWith('//')) {
          sessionStorage.removeItem('ma-pending-redirect');
          next = pending;
        }
      } catch {}

      if (next === '/dashboard') {
        const match = document.cookie.match(/ma-oauth-redirect=([^;]+)/);
        if (match) {
          try {
            const decoded = decodeURIComponent(match[1]);
            if (decoded.startsWith('/') && !decoded.startsWith('//')) {
              next = decoded;
            }
          } catch {}
          document.cookie = 'ma-oauth-redirect=; path=/; max-age=0';
        }
      }

      if (next === '/dashboard') {
        const urlNext = params.get('next');
        if (urlNext && urlNext.startsWith('/') && !urlNext.startsWith('//')) {
          next = urlNext;
        }
      }

      // Mark OAuth users as email verified (best-effort, non-blocking)
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase.from('profiles').update({ email_verified: true }).eq('id', user.id);
        }
      });

      router.replace(next);
    };

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-normal text-ink mb-2">Sign In Failed</h1>
          <p className="text-ink-muted text-sm mb-8">Something went wrong. Please try again.</p>
          <Link
            href="/login"
            className="px-6 py-2.5 bg-btn text-btn-text font-semibold text-xs tracking-[1.5px] rounded-sm hover:bg-btn-hover transition-colors"
          >
            BACK TO SIGN IN
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border border-edge-strong border-t-ink-secondary rounded-full animate-spin" />
        <p className="text-ink-muted text-[13px]">Signing in...</p>
      </div>
    </div>
  );
}
