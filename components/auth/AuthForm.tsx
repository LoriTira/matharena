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
    <div className="min-h-screen flex items-center justify-center bg-page">
      <div className="w-full max-w-md p-8 border border-edge rounded-sm">
        <h1 className="font-serif text-3xl font-normal text-ink text-center mb-1">
          {isSignIn ? 'Welcome Back' : 'Join MathsArena'}
        </h1>
        <p className="text-ink-muted text-center text-sm mb-8">
          {isSignIn ? 'Sign in to MathsArena' : 'Create your account and start competing'}
        </p>

        <GoogleOAuthButton redirect={redirect} />

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-edge" />
          <span className="text-[11px] tracking-[2px] text-ink-faint">OR</span>
          <div className="flex-1 h-px bg-edge" />
        </div>

        <form onSubmit={isSignIn ? handleSignIn : handleSignUp} className="space-y-4">
          {!isSignIn && (
            <div>
              <label htmlFor="username" className="block text-[11px] tracking-[2px] text-ink-muted mb-2 uppercase">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-card border border-edge rounded-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-edge-strong focus:border-edge-strong transition-colors"
                placeholder="mathwizard42"
                required
                minLength={3}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-[11px] tracking-[2px] text-ink-muted mb-2 uppercase">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-card border border-edge rounded-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-edge-strong focus:border-edge-strong transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[11px] tracking-[2px] text-ink-muted mb-2 uppercase">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-card border border-edge rounded-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-edge-strong focus:border-edge-strong transition-colors"
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
            className="w-full py-3 bg-btn text-btn-text font-semibold text-xs tracking-[1.5px] rounded-sm transition-colors hover:bg-btn-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? (isSignIn ? 'SIGNING IN...' : 'CREATING ACCOUNT...')
              : (isSignIn ? 'SIGN IN' : 'CREATE ACCOUNT')}
          </button>
        </form>

        <p className="mt-6 text-center text-ink-muted text-sm">
          {isSignIn ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-ink-secondary underline underline-offset-2 decoration-edge hover:text-ink transition-colors"
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
                className="text-ink-secondary underline underline-offset-2 decoration-edge hover:text-ink transition-colors"
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
