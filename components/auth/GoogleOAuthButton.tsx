'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isNativePlatform } from '@/lib/native/platform';
import { Browser } from '@capacitor/browser';
import { App as CapApp, type URLOpenListenerEvent } from '@capacitor/app';

const NATIVE_REDIRECT = 'com.mathsarena.app://auth/callback';

async function handleNativeOAuth(supabase: ReturnType<typeof createClient>) {
  // Ask Supabase for the Google OAuth URL without redirecting the WebView
  // (Google blocks OAuth inside embedded WebViews, and our app-bound domain
  // policy blocks navigation away from mathsarena.com anyway).
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: NATIVE_REDIRECT,
      skipBrowserRedirect: true,
    },
  });
  if (error || !data?.url) throw error ?? new Error('No OAuth URL returned');

  // Open the OAuth URL in SFSafariViewController. When Google redirects to
  // our custom URL scheme, iOS dispatches `appUrlOpen` and we exchange the
  // auth code for a Supabase session.
  const urlListener = await CapApp.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
    if (!event.url.startsWith(NATIVE_REDIRECT)) return;

    await Browser.close().catch(() => {});
    urlListener.remove();

    const callbackUrl = new URL(event.url);
    const code = callbackUrl.searchParams.get('code');
    if (!code) return;

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error('Code exchange failed:', exchangeError.message);
      return;
    }

    // Reload the WebView so server components pick up the new auth cookie.
    window.location.reload();
  });

  await Browser.open({ url: data.url, presentationStyle: 'popover' });
}

export function GoogleOAuthButton({ redirect, label = 'Continue with Google' }: { redirect?: string | null; label?: string }) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setLoading(true);

    if (isNativePlatform()) {
      try {
        await handleNativeOAuth(supabase);
      } catch (err) {
        console.error('Native Google OAuth error:', err);
        setLoading(false);
      }
      return;
    }

    // Web: store redirect in sessionStorage (survives OAuth redirect chain
    // reliably) and as cookie fallback for the server-side callback route.
    if (redirect) {
      try { sessionStorage.setItem('ma-pending-redirect', redirect); } catch {}
      document.cookie = `ma-oauth-redirect=${encodeURIComponent(redirect)}; path=/; max-age=300; SameSite=Lax`;
    }

    const redirectTo = `${window.location.origin}/callback${redirect ? `?next=${encodeURIComponent(redirect)}` : ''}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.error('Google OAuth error:', error.message);
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 py-3 bg-card border border-edge rounded-sm text-ink text-sm font-medium hover:bg-card-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z" fill="#EA4335"/>
      </svg>
      {loading ? 'Redirecting...' : label}
    </button>
  );
}
