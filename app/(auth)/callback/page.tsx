'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function getRedirectDestination(): string {
  // sessionStorage (most reliable across OAuth redirects)
  try {
    const pending = sessionStorage.getItem('ma-pending-redirect');
    if (pending && pending.startsWith('/') && !pending.startsWith('//')) {
      sessionStorage.removeItem('ma-pending-redirect');
      return pending;
    }
  } catch {}

  // Cookie fallback
  const match = document.cookie.match(/ma-oauth-redirect=([^;]+)/);
  if (match) {
    try {
      const decoded = decodeURIComponent(match[1]);
      document.cookie = 'ma-oauth-redirect=; path=/; max-age=0';
      if (decoded.startsWith('/') && !decoded.startsWith('//')) {
        return decoded;
      }
    } catch {}
  }

  // URL param fallback
  const urlNext = new URLSearchParams(window.location.search).get('next');
  if (urlNext && urlNext.startsWith('/') && !urlNext.startsWith('//')) {
    return urlNext;
  }

  return '/dashboard';
}

export default function CallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const supabase = createClient();

    const handleCallback = async () => {
      // Wait for the Supabase client to initialize (reads cookies, etc.)
      const { data: { session: existingSession } } = await supabase.auth.getSession();

      if (existingSession) {
        // Already authenticated (auto-init handled it) — just redirect
        router.replace(getRedirectDestination());
        return;
      }

      // Try explicit PKCE code exchange
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeError) {
          // Mark OAuth users as email verified (best-effort)
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
              supabase.from('profiles').update({ email_verified: true }).eq('id', user.id);
            }
          });
          router.replace(getRedirectDestination());
          return;
        }
        console.error('OAuth exchange error:', exchangeError.message);
      }

      // Final retry — session might have been established asynchronously
      await new Promise(resolve => setTimeout(resolve, 2000));
      const { data: { session: retrySession } } = await supabase.auth.getSession();
      if (retrySession) {
        router.replace(getRedirectDestination());
        return;
      }

      // Redirect to login with the intended destination preserved
      const next = getRedirectDestination();
      if (next !== '/dashboard') {
        router.replace(`/login?redirect=${encodeURIComponent(next)}`);
      } else {
        setError(code ? 'Code exchange failed' : 'No auth code received');
      }
    };

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-normal text-ink mb-2">Sign In Failed</h1>
          <p className="text-ink-muted text-sm mb-2">Something went wrong. Please try again.</p>
          <p className="text-ink-faint text-xs mb-8 font-mono">{error}</p>
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
