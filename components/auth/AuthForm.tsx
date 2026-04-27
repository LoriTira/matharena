'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GoogleOAuthButton } from '@/components/auth/GoogleOAuthButton';
import { getValidRedirect } from '@/lib/auth/redirect';

type AuthMode = 'signin' | 'signup';

export function AuthForm({
  initialMode,
  redirect,
}: {
  initialMode: AuthMode;
  redirect: string | null;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setPassword('');
    setError('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(getValidRedirect(redirect));
      router.refresh();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      setLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      setLoading(false);
      return;
    }

    const signupRes = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username }),
    });

    if (!signupRes.ok) {
      const data = await signupRes.json();
      setError(data.error || 'Failed to create account');
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push(redirect ? `/onboarding?redirect=${encodeURIComponent(redirect)}` : '/onboarding');
    router.refresh();
  };

  const isSignIn = mode === 'signin';

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4 py-8">
      <div className="w-full max-w-md p-6 sm:p-8 border-2 border-edge-strong bg-panel rounded-xl">
        <div className="text-[11px] tracking-[4px] font-black text-accent text-center mb-2">
          ▸ {isSignIn ? 'WELCOME BACK' : 'JOIN MATHSARENA'}
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-black text-ink text-center mb-2 leading-none tracking-tight">
          {isSignIn ? 'Sign in.' : 'Create account.'}
        </h1>
        <p className="text-ink-tertiary text-center text-[13px] font-medium mb-7">
          {isSignIn ? 'Continue where you left off.' : 'Start competing in 30 seconds.'}
        </p>

        <GoogleOAuthButton redirect={redirect} />

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-edge-strong" />
          <span className="text-[11px] tracking-[3px] font-black text-ink-tertiary">OR</span>
          <div className="flex-1 h-px bg-edge-strong" />
        </div>

        <form onSubmit={isSignIn ? handleSignIn : handleSignUp} className="space-y-5">
          {!isSignIn && (
            <div>
              <label htmlFor="username" className="block text-[11px] tracking-[2.5px] font-black text-ink-tertiary mb-2 uppercase">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3.5 bg-card border-2 border-edge-strong rounded-md text-ink font-medium placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                placeholder="mathwizard42"
                required
                minLength={3}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-[11px] tracking-[2.5px] font-black text-ink-tertiary mb-2 uppercase">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 bg-card border-2 border-edge-strong rounded-md text-ink font-medium placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[11px] tracking-[2.5px] font-black text-ink-tertiary mb-2 uppercase">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 pr-12 bg-card border-2 border-edge-strong rounded-md text-ink font-medium placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                placeholder="••••••••"
                required
                minLength={isSignIn ? undefined : 6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-tertiary transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          {isSignIn && (
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-[12px] text-ink-muted hover:text-ink-tertiary transition-colors">
                Forgot password?
              </Link>
            </div>
          )}

          {error && (
            <div>
              <p className="text-red-400/70 text-sm">{error}</p>
              {isSignIn && error === 'Invalid login credentials' && (
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="mt-1 text-sm text-ink-secondary underline underline-offset-2 decoration-edge hover:text-ink transition-colors"
                >
                  Don&apos;t have an account? Sign up instead
                </button>
              )}
              {!isSignIn && error === 'An account with this email already exists' && (
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="mt-1 text-sm text-ink-secondary underline underline-offset-2 decoration-edge hover:text-ink transition-colors"
                >
                  Sign in instead
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-accent text-on-accent font-black text-[12px] tracking-[2.5px] rounded-md transition-all hover:scale-[1.01] hover:bg-accent/90 shadow-[0_4px_20px_var(--accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading
              ? (isSignIn ? 'SIGNING IN...' : 'CREATING ACCOUNT...')
              : (isSignIn ? 'SIGN IN' : 'CREATE ACCOUNT')}
          </button>
        </form>

        <p className="mt-7 text-center text-ink-tertiary text-[13px] font-medium">
          {isSignIn ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-accent font-black underline underline-offset-4 decoration-2 decoration-accent/40 hover:decoration-accent transition-colors"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-accent font-black underline underline-offset-4 decoration-2 decoration-accent/40 hover:decoration-accent transition-colors"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
