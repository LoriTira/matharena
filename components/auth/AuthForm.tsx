'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GoogleOAuthButton } from '@/components/auth/GoogleOAuthButton';
import { Shell } from '@/components/arcade/Shell';
import { Btn } from '@/components/arcade/Btn';
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
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

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
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
    <Shell>
      <div className="min-h-screen flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[420px]">
          {/* Brand mark */}
          <Link href="/" className="flex items-center gap-[10px] justify-center mb-8">
            <span
              className="grid place-items-center font-mono font-bold text-[14px] text-[#0a0612]"
              style={{
                width: 28, height: 28,
                background: 'var(--neon-magenta)',
                boxShadow: '0 0 18px var(--neon-magenta), inset 0 0 0 2px rgba(0,0,0,0.15)',
              }}
            >∑</span>
            <span className="font-display font-bold text-[17px] tracking-[-0.3px] text-ink">
              MATHS<span className="text-cyan">ARENA</span>
            </span>
          </Link>

          <div className="border border-edge-strong bg-panel p-[28px] md:p-[40px] relative">
            {/* Mode tag */}
            <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[2px] text-center mb-[10px]">
              {isSignIn ? '/ Insert coin' : '/ New player'}
            </div>
            <h1 className="font-display font-extrabold text-[32px] md:text-[40px] tracking-[-1.2px] leading-[1.05] text-ink text-center">
              {isSignIn ? (
                <>Welcome <span className="text-cyan italic">back.</span></>
              ) : (
                <>Ready, <span className="text-magenta italic">player one?</span></>
              )}
            </h1>
            <p className="font-mono text-[11px] text-ink-tertiary text-center mt-[10px] tracking-[1px] uppercase">
              {isSignIn ? 'Sign in and resume your climb' : 'Create your account — 30 seconds'}
            </p>

            <div className="space-y-3 mt-[24px]">
              <GoogleOAuthButton
                redirect={redirect}
                label={isSignIn ? 'Continue with Google' : 'Sign up with Google'}
              />
            </div>

            <div className="flex items-center gap-3 my-[22px]">
              <div className="flex-1 h-px bg-edge" />
              <span className="font-mono text-[10px] tracking-[2px] text-ink-faint uppercase">OR</span>
              <div className="flex-1 h-px bg-edge" />
            </div>

            <form onSubmit={isSignIn ? handleSignIn : handleSignUp} className="space-y-[14px]">
              {!isSignIn && (
                <div>
                  <label htmlFor="username" className="block font-mono text-[10px] tracking-[1.6px] text-ink-faint mb-[6px] uppercase">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-3 bg-page border border-edge text-ink font-mono text-[13px] placeholder:text-ink-faint focus:outline-none focus:border-cyan transition-colors"
                    placeholder="mathwizard42"
                    required
                    minLength={3}
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block font-mono text-[10px] tracking-[1.6px] text-ink-faint mb-[6px] uppercase">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-3 bg-page border border-edge text-ink font-mono text-[13px] placeholder:text-ink-faint focus:outline-none focus:border-cyan transition-colors"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block font-mono text-[10px] tracking-[1.6px] text-ink-faint mb-[6px] uppercase">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-3 pr-12 bg-page border border-edge text-ink font-mono text-[13px] placeholder:text-ink-faint focus:outline-none focus:border-cyan transition-colors"
                    placeholder="••••••••"
                    required
                    minLength={isSignIn ? undefined : 6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-cyan transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {isSignIn && (
                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="font-mono text-[11px] text-ink-tertiary hover:text-cyan tracking-[1px] uppercase transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}

              {error && (
                <div className="border border-magenta bg-[rgba(255,42,127,0.06)] px-3 py-2">
                  <p className="font-mono text-[11px] text-magenta tracking-[0.3px]">{error}</p>
                  {isSignIn && error === 'Invalid login credentials' && (
                    <button
                      type="button"
                      onClick={() => switchMode('signup')}
                      className="mt-1 font-mono text-[10px] text-ink-tertiary hover:text-cyan uppercase tracking-[1.2px] transition-colors"
                    >
                      → Don&apos;t have an account? Sign up
                    </button>
                  )}
                  {!isSignIn && error === 'An account with this email already exists' && (
                    <button
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="mt-1 font-mono text-[10px] text-ink-tertiary hover:text-cyan uppercase tracking-[1.2px] transition-colors"
                    >
                      → Sign in instead
                    </button>
                  )}
                </div>
              )}

              <Btn type="submit" variant="primary" size="lg" full disabled={loading}>
                {loading
                  ? (isSignIn ? 'Signing in…' : 'Creating account…')
                  : (isSignIn ? '▶ Sign in' : '▶ Create account')}
              </Btn>
            </form>

            <p className="mt-6 text-center font-mono text-[11px] text-ink-tertiary tracking-[0.5px]">
              {isSignIn ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="text-cyan hover:underline tracking-[0.5px] transition-colors"
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
                    className="text-cyan hover:underline tracking-[0.5px] transition-colors"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </Shell>
  );
}
