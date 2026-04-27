'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => router.push('/'), 2000);
    }
  };

  const EyeIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  );

  const EyeOffIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4 py-8">
      <div className="w-full max-w-md p-6 sm:p-8 border-2 border-edge-strong bg-panel rounded-xl">
        <div className="text-[11px] tracking-[4px] font-black text-accent text-center mb-2">▸ NEW PASSWORD</div>
        <h1 className="font-serif text-3xl sm:text-4xl font-black text-ink text-center mb-2 tracking-tight leading-none">
          Choose a new one.
        </h1>
        <p className="text-ink-tertiary text-center text-[13px] font-medium mb-7">At least 6 characters.</p>

        {success ? (
          <div className="p-5 rounded-md bg-accent-glow border-2 border-accent text-center">
            <p className="text-ink font-bold text-[14px]">✓ Password updated successfully!</p>
            <p className="text-ink-tertiary text-[12px] font-medium mt-2">Redirecting…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-[11px] tracking-[2.5px] font-black text-ink-tertiary mb-2 uppercase">
                New Password
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
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? EyeOffIcon : EyeIcon}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-[11px] tracking-[2.5px] font-black text-ink-tertiary mb-2 uppercase">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3.5 pr-12 bg-card border-2 border-edge-strong rounded-md text-ink font-medium placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <p className="text-feedback-wrong text-[13px] font-semibold">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-accent text-on-accent font-black text-[12px] tracking-[2.5px] rounded-md transition-all hover:scale-[1.01] hover:bg-accent/90 shadow-[0_4px_20px_var(--accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'UPDATING...' : '▸ UPDATE PASSWORD'}
            </button>
          </form>
        )}

        <p className="mt-7 text-center text-ink-tertiary text-[13px] font-medium">
          <Link href="/login" className="text-accent font-black underline underline-offset-4 decoration-2 decoration-accent/40 hover:decoration-accent transition-colors">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
