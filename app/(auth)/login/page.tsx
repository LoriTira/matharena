'use client';

import { Suspense, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
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
      router.push(redirect || '/dashboard');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <div className="w-full max-w-md p-8 border border-white/[0.06] rounded-sm">
        <h1 className="font-serif text-3xl font-light text-white/90 text-center mb-1">Welcome Back</h1>
        <p className="text-white/25 text-center text-sm mb-8">Sign in to MathArena</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-[9px] tracking-[2px] text-white/25 mb-2 uppercase">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-sm text-white/80 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/15 transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[9px] tracking-[2px] text-white/25 mb-2 uppercase">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-sm text-white/80 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/15 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-red-400/70 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-white/90 text-[#050505] font-semibold text-xs tracking-[1.5px] rounded-sm transition-colors hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>

        <p className="mt-6 text-center text-white/30 text-sm">
          Don&apos;t have an account?{' '}
          <Link href={redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : '/signup'} className="text-white/60 underline underline-offset-2 decoration-white/15 hover:text-white/80 transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-white/25">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
