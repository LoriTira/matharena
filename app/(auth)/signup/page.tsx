'use client';

import { Suspense, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: username,
        },
        emailRedirectTo: `${window.location.origin}/callback${redirect ? `?next=${encodeURIComponent(redirect)}` : ''}`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(redirect || '/dashboard');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page">
      <div className="w-full max-w-md p-8 border border-edge rounded-sm">
        <h1 className="font-serif text-3xl font-light text-ink text-center mb-1">Join MathArena</h1>
        <p className="text-ink-muted text-center text-sm mb-8">Create your account and start competing</p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-[9px] tracking-[2px] text-ink-muted mb-2 uppercase">
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

          <div>
            <label htmlFor="email" className="block text-[9px] tracking-[2px] text-ink-muted mb-2 uppercase">
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
            <label htmlFor="password" className="block text-[9px] tracking-[2px] text-ink-muted mb-2 uppercase">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-card border border-edge rounded-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-edge-strong focus:border-edge-strong transition-colors"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <p className="text-red-400/70 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-btn text-btn-text font-semibold text-xs tracking-[1.5px] rounded-sm transition-colors hover:bg-btn-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className="mt-6 text-center text-ink-muted text-sm">
          Already have an account?{' '}
          <Link href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'} className="text-ink-secondary underline underline-offset-2 decoration-edge hover:text-ink transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-ink-muted">Loading...</div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
