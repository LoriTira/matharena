'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
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
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <div className="w-full max-w-md p-8 border border-white/[0.06] rounded-sm">
        <h1 className="font-serif text-3xl font-light text-white/90 text-center mb-1">Join MathArena</h1>
        <p className="text-white/25 text-center text-sm mb-8">Create your account and start competing</p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-[9px] tracking-[2px] text-white/25 mb-2 uppercase">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-sm text-white/80 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/15 transition-colors"
              placeholder="mathwizard42"
              required
              minLength={3}
            />
          </div>

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
              minLength={6}
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
            {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className="mt-6 text-center text-white/30 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-white/60 underline underline-offset-2 decoration-white/15 hover:text-white/80 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
