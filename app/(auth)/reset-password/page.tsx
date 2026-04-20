'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '@/components/arcade/Shell';
import { Btn } from '@/components/arcade/Btn';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => router.push('/dashboard'), 2000);
    }
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
              / New password
            </div>
            <h1 className="font-display font-extrabold text-[32px] md:text-[38px] tracking-[-1px] leading-[1.05] text-ink text-center">
              Choose a <span className="text-cyan italic">new</span> one.
            </h1>

            <div className="mt-[24px]">
              {success ? (
                <div className="border border-lime bg-[rgba(166,255,77,0.06)] px-4 py-3 text-center">
                  <div className="font-mono text-[12px] text-lime tracking-[0.5px]">
                    ✓ Password updated
                  </div>
                  <div className="font-mono text-[10px] text-ink-tertiary mt-[4px] tracking-[1px] uppercase">
                    Redirecting to dashboard…
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-[14px]">
                  <div>
                    <label htmlFor="password" className="block font-mono text-[10px] tracking-[1.6px] text-ink-faint mb-[6px] uppercase">
                      New password
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
                        minLength={6}
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

                  <div>
                    <label htmlFor="confirm-password" className="block font-mono text-[10px] tracking-[1.6px] text-ink-faint mb-[6px] uppercase">
                      Confirm password
                    </label>
                    <input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-3 bg-page border border-edge text-ink font-mono text-[13px] placeholder:text-ink-faint focus:outline-none focus:border-cyan transition-colors"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>

                  {error && (
                    <p className="font-mono text-[11px] text-magenta">{error}</p>
                  )}

                  <Btn type="submit" variant="primary" full size="lg" disabled={loading}>
                    {loading ? 'Updating…' : '▶ Update password'}
                  </Btn>
                </form>
              )}
            </div>

            <p className="mt-6 text-center font-mono text-[11px] text-ink-tertiary tracking-[0.5px]">
              <Link href="/login" className="text-cyan hover:underline transition-colors">
                ← Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Shell>
  );
}
