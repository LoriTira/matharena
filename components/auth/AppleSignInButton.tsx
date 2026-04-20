'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppleSignIn } from '@/lib/native/apple-sign-in';
import { getValidRedirect } from '@/lib/auth/redirect';

interface AppleAuthError {
  code?: string;
  message?: string;
}

export function AppleSignInButton({
  redirect,
  label = 'Sign in with Apple',
}: {
  redirect?: string | null;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleClick = async () => {
    setError(null);
    setLoading(true);
    try {
      const credential = await AppleSignIn.authorize();
      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (signInError) {
        throw new Error(signInError.message);
      }
      router.push(getValidRedirect(redirect ?? null));
      router.refresh();
    } catch (err) {
      const authErr = err as AppleAuthError;
      if (authErr.code === 'cancelled') {
        setLoading(false);
        return;
      }
      console.error('Apple Sign In error:', err);
      setError(authErr.message ?? 'Sign in with Apple failed');
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-3 bg-black border border-black rounded-sm text-white text-sm font-medium hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg width="16" height="20" viewBox="0 0 16 20" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path d="M11.624 10.453c-.02-2.008 1.641-2.97 1.716-3.016-.934-1.364-2.39-1.55-2.911-1.572-1.24-.125-2.418.727-3.046.727-.63 0-1.596-.708-2.623-.689-1.35.02-2.593.782-3.288 1.983-1.402 2.43-.36 6.032 1.005 8.01.668.968 1.463 2.057 2.509 2.019 1.006-.04 1.386-.651 2.603-.651 1.215 0 1.557.651 2.623.631 1.083-.018 1.771-.986 2.433-1.958.767-1.121 1.084-2.207 1.103-2.263-.025-.012-2.112-.811-2.124-3.221zM9.731 4.533c.548-.663.917-1.586.817-2.502-.788.032-1.742.525-2.309 1.188-.507.585-.951 1.523-.831 2.422.878.067 1.775-.445 2.323-1.108z"/>
        </svg>
        {loading ? 'Authorizing...' : label}
      </button>
      {error && <p className="mt-2 text-red-400/70 text-sm">{error}</p>}
    </>
  );
}
