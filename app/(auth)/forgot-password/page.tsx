'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Shell } from '@/components/arcade/Shell';
import { Btn } from '@/components/arcade/Btn';

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
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <Shell>
      <div className="min-h-screen flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[420px]">
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

          <div className="border border-edge-strong bg-panel p-[28px] md:p-[40px]">
            <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[2px] text-center mb-[10px]">
              / Reset access
            </div>
            <h1 className="font-display font-extrabold text-[32px] md:text-[38px] tracking-[-1px] leading-[1.05] text-ink text-center">
              Forgot <span className="text-gold italic">password?</span>
            </h1>
            <p className="font-mono text-[11px] text-ink-tertiary text-center mt-[10px] tracking-[1px] uppercase">
              Enter your email and we&apos;ll send a reset link
            </p>

            <div className="mt-[24px]">
              {sent ? (
                <div className="space-y-4">
                  <div className="border border-lime bg-[rgba(166,255,77,0.06)] px-4 py-3 text-center">
                    <div className="font-mono text-[12px] text-lime tracking-[0.5px]">
                      ✓ Check your inbox
                    </div>
                    <div className="font-mono text-[10px] text-ink-tertiary mt-[4px] tracking-[1px] uppercase">
                      If you don&apos;t see it, check spam
                    </div>
                  </div>
                  <Link href="/login" className="block">
                    <Btn variant="primary" full size="lg">← Back to sign in</Btn>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-[14px]">
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
                  {error && (
                    <p className="font-mono text-[11px] text-magenta">{error}</p>
                  )}
                  <Btn type="submit" variant="primary" full size="lg" disabled={loading}>
                    {loading ? 'Sending…' : '▶ Send reset link'}
                  </Btn>
                </form>
              )}
            </div>

            <p className="mt-6 text-center font-mono text-[11px] text-ink-tertiary tracking-[0.5px]">
              Remember your password?{' '}
              <Link href="/login" className="text-cyan hover:underline transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Shell>
  );
}
