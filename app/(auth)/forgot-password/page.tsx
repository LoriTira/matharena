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
    <div className="min-h-screen flex items-center justify-center bg-page px-4 py-8">
      <div className="w-full max-w-md p-6 sm:p-8 border-2 border-edge-strong bg-panel rounded-xl">
        <div className="text-[11px] tracking-[4px] font-black text-accent text-center mb-2">▸ RESET PASSWORD</div>
        <h1 className="font-serif text-3xl sm:text-4xl font-black text-ink text-center mb-2 tracking-tight leading-none">
          Forgot it?
        </h1>
        <p className="text-ink-tertiary text-center text-[13px] font-medium mb-7">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {sent ? (
          <div className="space-y-4">
            <div className="p-5 rounded-md bg-accent-glow border-2 border-accent text-center">
              <p className="text-ink font-bold text-[14px]">
                ✓ Check your email for a password reset link.
              </p>
              <p className="text-ink-tertiary text-[12px] font-medium mt-2">
                If you don&apos;t see it, check your spam folder.
              </p>
            </div>
            <Link
              href="/login"
              className="block w-full py-4 text-center bg-accent text-on-accent font-black text-[12px] tracking-[2.5px] rounded-md transition-all hover:scale-[1.01] hover:bg-accent/90 shadow-[0_4px_20px_var(--accent-glow)]"
            >
              ▸ BACK TO SIGN IN
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
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

            {error && (
              <p className="text-feedback-wrong text-[13px] font-semibold">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-accent text-on-accent font-black text-[12px] tracking-[2.5px] rounded-md transition-all hover:scale-[1.01] hover:bg-accent/90 shadow-[0_4px_20px_var(--accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'SENDING...' : '▸ SEND RESET LINK'}
            </button>
          </form>
        )}

        <p className="mt-7 text-center text-ink-tertiary text-[13px] font-medium">
          Remember your password?{' '}
          <Link href="/login" className="text-accent font-black underline underline-offset-4 decoration-2 decoration-accent/40 hover:decoration-accent transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
