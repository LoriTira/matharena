'use client';

import { useEffect, useState, useRef } from 'react';
import { use } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ChallengeAcceptPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace(`/login?redirect=/challenge/${code}/accept`);
      return;
    }

    if (attemptedRef.current) return;
    attemptedRef.current = true;

    const accept = async () => {
      try {
        const res = await fetch('/api/challenge/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        const data = await res.json();

        if (res.ok || data.alreadyAccepted) {
          router.replace(`/challenge/${code}/lobby`);
          return;
        }

        setError(data.error || 'Failed to accept challenge');
      } catch {
        setError('Something went wrong. Please try again.');
      }
    };

    accept();
  }, [code, user, authLoading, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-normal text-ink mb-2">Cannot Join Challenge</h1>
          <p className="text-ink-muted text-sm mb-8">{error}</p>
          <Link
            href="/dashboard"
            className="px-6 py-2.5 bg-btn text-btn-text font-semibold text-xs tracking-[1.5px] rounded-sm hover:bg-btn-hover transition-colors"
          >
            DASHBOARD
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border border-edge-strong border-t-ink-secondary rounded-full animate-spin" />
        <p className="text-ink-muted text-[13px]">Joining challenge...</p>
      </div>
    </div>
  );
}
