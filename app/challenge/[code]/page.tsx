'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Challenge, Profile } from '@/types';

export default function ChallengePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [sender, setSender] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchChallenge = async () => {
      const { data, error: fetchError } = await supabase
        .from('challenges')
        .select('*')
        .eq('code', code)
        .single();

      if (fetchError || !data) {
        setError('Challenge not found');
        setLoading(false);
        return;
      }

      const c = data as Challenge;
      setChallenge(c);

      // If the current user already accepted, go straight to lobby
      if (user && c.recipient_id === user.id && c.status === 'accepted') {
        router.push(`/challenge/${code}/lobby`);
        return;
      }

      const { data: senderData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', c.sender_id)
        .single();

      if (senderData) setSender(senderData as Profile);
      setLoading(false);
    };

    if (!authLoading) {
      fetchChallenge();
    }
  }, [code, user, authLoading]);

  const handleAccept = async () => {
    setAccepting(true);
    setError('');

    const res = await fetch('/api/challenge/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Failed to accept challenge');
      setAccepting(false);
      return;
    }

    router.push(`/challenge/${code}/lobby`);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-ink-muted">Loading...</div>
      </div>
    );
  }

  // Error / not found
  if (error && !challenge) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-normal text-ink mb-2">Challenge Not Found</h1>
          <p className="text-ink-muted text-sm mb-8">This challenge link may have expired or is invalid.</p>
          <Link href="/" className="px-6 py-2.5 bg-btn text-btn-text font-semibold text-xs tracking-[1.5px] rounded-sm hover:bg-btn-hover transition-colors">
            GO TO MATHSARENA
          </Link>
        </div>
      </div>
    );
  }

  if (!challenge || !sender) return null;

  // Expired
  if (challenge.status === 'expired' || new Date(challenge.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-normal text-ink mb-2">Challenge Expired</h1>
          <p className="text-ink-muted text-sm mb-8">This challenge is no longer available.</p>
          <Link href="/" className="px-6 py-2.5 bg-btn text-btn-text font-semibold text-xs tracking-[1.5px] rounded-sm hover:bg-btn-hover transition-colors">
            GO TO MATHSARENA
          </Link>
        </div>
      </div>
    );
  }

  // Completed
  if (challenge.status === 'completed') {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-normal text-ink mb-2">Challenge Completed</h1>
          <p className="text-ink-muted text-sm mb-8">This challenge has already been played.</p>
          <Link href="/dashboard" className="px-6 py-2.5 bg-btn text-btn-text font-semibold text-xs tracking-[1.5px] rounded-sm hover:bg-btn-hover transition-colors">
            DASHBOARD
          </Link>
        </div>
      </div>
    );
  }

  // Already taken by someone else
  if (challenge.status === 'accepted' && challenge.recipient_id && challenge.recipient_id !== user?.id) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-normal text-ink mb-2">Challenge Taken</h1>
          <p className="text-ink-muted text-sm mb-8">Someone else already accepted this challenge.</p>
          <Link href="/" className="px-6 py-2.5 bg-btn text-btn-text font-semibold text-xs tracking-[1.5px] rounded-sm hover:bg-btn-hover transition-colors">
            GO TO MATHSARENA
          </Link>
        </div>
      </div>
    );
  }

  // Sender viewing own challenge
  if (user && challenge.sender_id === user.id) {
    const isAccepted = challenge.status === 'accepted';
    return (
      <div className="min-h-screen bg-page flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-[11px] tracking-[4px] font-black text-accent mb-3">▸ CHALLENGE</div>
          <h1 className="font-serif text-3xl sm:text-4xl font-black text-ink leading-none tracking-tight mb-3">
            {isAccepted ? 'Accepted!' : 'Your challenge.'}
          </h1>
          <p className="text-ink-tertiary text-[14px] font-medium mb-8 leading-relaxed">
            {isAccepted
              ? 'Your opponent is ready. Head to the lobby to start the match.'
              : 'Share this link with a friend to challenge them.'}
          </p>
          {isAccepted ? (
            <Link href={`/challenge/${code}/lobby`} className="inline-block px-8 py-4 bg-accent text-on-accent font-black text-[12px] tracking-[2.5px] rounded-md hover:scale-[1.02] transition-all shadow-[0_4px_24px_var(--accent-glow)]">
              ▸ GO TO LOBBY
            </Link>
          ) : (
            <Link href="/" className="inline-block px-8 py-4 bg-accent text-on-accent font-black text-[12px] tracking-[2.5px] rounded-md hover:scale-[1.02] transition-all shadow-[0_4px_24px_var(--accent-glow)]">
              ▸ DASHBOARD
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Main landing page — the money shot
  const winRate = sender.games_played > 0
    ? Math.round((sender.games_won / sender.games_played) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4 py-8">
      <div className="text-center max-w-md w-full">
        <div className="text-[11px] tracking-[5px] font-black text-accent mb-5">
          ▸ YOU&apos;VE BEEN CHALLENGED
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-black text-ink leading-none tracking-tight mb-3">
          {sender.display_name || sender.username}
        </h1>
        <div className="font-mono text-[14px] text-ink-secondary mb-10 inline-flex items-center gap-3 px-4 py-2 border-2 border-edge-strong rounded-md bg-shade">
          <span><span className="text-[10px] font-black tracking-[2px] text-ink-tertiary mr-1">ELO</span><span className="font-black text-ink">{sender.elo_rating.toLocaleString()}</span></span>
          <span className="text-ink-faint">·</span>
          <span><span className="font-black text-ink">{winRate}%</span> <span className="text-[10px] font-black tracking-[2px] text-ink-tertiary">WIN</span></span>
        </div>

        {error && (
          <p className="text-feedback-wrong text-[13px] font-semibold mb-4">{error}</p>
        )}

        {user ? (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full sm:w-auto px-12 py-4 bg-accent text-on-accent font-black text-[13px] tracking-[2.5px] rounded-md hover:scale-[1.02] transition-all shadow-[0_4px_24px_var(--accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {accepting ? 'ACCEPTING...' : '▸ ACCEPT CHALLENGE'}
          </button>
        ) : (
          <Link
            href={`/login?redirect=/challenge/${code}/accept`}
            className="inline-block w-full sm:w-auto px-12 py-4 bg-accent text-on-accent font-black text-[13px] tracking-[2.5px] rounded-md hover:scale-[1.02] transition-all shadow-[0_4px_24px_var(--accent-glow)]"
          >
            ▸ ACCEPT CHALLENGE
          </Link>
        )}

        <p className="text-ink-tertiary text-[12px] font-semibold mt-6">
          {user ? 'First to 5 · Mental math only' : 'Free · No download needed'}
        </p>
      </div>
    </div>
  );
}
