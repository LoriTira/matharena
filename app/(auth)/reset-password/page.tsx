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
      setTimeout(() => router.push('/dashboard'), 2000);
    }
  };

  const EyeIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  );

  const EyeOffIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-page">
      <div className="w-full max-w-md p-8 border border-edge rounded-sm">
        <h1 className="font-serif text-3xl font-normal text-ink text-center mb-1">New Password</h1>
        <p className="text-ink-muted text-center text-sm mb-8">Choose a new password for your account</p>

        {success ? (
          <div className="p-4 rounded-sm bg-card border border-edge text-center">
            <p className="text-ink-secondary text-sm">Password updated successfully!</p>
            <p className="text-ink-muted text-[12px] mt-2">Redirecting to dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-[11px] tracking-[2px] text-ink-muted mb-2 uppercase">
                New Password
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
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-tertiary transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? EyeOffIcon : EyeIcon}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-[11px] tracking-[2px] text-ink-muted mb-2 uppercase">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-card border border-edge rounded-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-edge-strong focus:border-edge-strong transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <p className="text-red-400/70 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-btn text-btn-text font-semibold text-xs tracking-[1.5px] rounded-sm transition-colors hover:bg-btn-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-ink-muted text-sm">
          <Link href="/login" className="text-ink-secondary underline underline-offset-2 decoration-edge hover:text-ink transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
