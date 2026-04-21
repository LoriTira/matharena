'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page">
      <div className="w-full max-w-md p-8 border border-edge rounded-sm">
        <h1 className="font-serif text-3xl font-normal text-ink text-center mb-1">Reset Password</h1>
        <p className="text-ink-muted text-center text-sm mb-8">
          Enter your email and we&apos;ll send you a reset link
        </p>

        {sent ? (
          <div className="space-y-4">
            <div className="p-4 rounded-sm bg-card border border-edge text-center">
              <p className="text-ink-secondary text-sm">
                Check your email for a password reset link.
              </p>
              <p className="text-ink-muted text-[12px] mt-2">
                If you don&apos;t see it, check your spam folder.
              </p>
            </div>
            <Link
              href="/login"
              className="block w-full py-3 text-center bg-btn text-btn-text font-semibold text-xs tracking-[1.5px] rounded-sm transition-colors hover:bg-btn-hover"
            >
              BACK TO SIGN IN
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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

            {error && (
              <p className="text-red-400/70 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-btn text-btn-text font-semibold text-xs tracking-[1.5px] rounded-sm transition-colors hover:bg-btn-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'SENDING...' : 'SEND RESET LINK'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-ink-muted text-sm">
          Remember your password?{' '}
          <Link href="/login" className="text-ink-secondary underline underline-offset-2 decoration-edge hover:text-ink transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
