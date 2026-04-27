'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import type { Challenge, Profile } from '@/types';

const POLL_INTERVAL_MS = 2_000;
const MAX_CONSECUTIVE_ERRORS = 3;
const LOBBY_TIMEOUT_MS = 5 * 60 * 1_000; // 5 minutes

function PlayerCard({ profile, ready, isYou }: { profile: Profile | null; ready: boolean; isYou: boolean }) {
  if (!profile) return null;
  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0;

  return (
    <div className={`border-2 rounded-xl p-5 sm:p-6 flex-1 min-w-[200px] transition-all ${
      isYou
        ? 'border-accent bg-accent-glow shadow-[0_0_30px_var(--accent-glow)]'
        : ready
          ? 'border-edge-bold bg-panel'
          : 'border-edge-strong bg-panel'
    }`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2.5 h-2.5 rounded-full transition-colors ${ready ? 'bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-ink-muted'}`} />
        <span className={`text-[11px] tracking-[3px] font-black ${ready ? 'text-feedback-correct' : 'text-ink-tertiary'}`}>
          {ready ? '▸ READY' : '▸ WAITING'}
        </span>
      </div>
      <div className="font-serif text-2xl font-black text-ink mb-1 truncate tracking-tight">
        {profile.display_name || profile.username}
      </div>
      <div className="font-mono text-[14px] font-bold text-ink-secondary mb-4">
        <span className="text-[10px] tracking-[2px] font-black text-ink-tertiary uppercase mr-1.5">Elo</span>
        <span className={isYou ? 'text-accent font-black' : 'text-ink font-black'}>{profile.elo_rating.toLocaleString()}</span>
      </div>
      <div className="flex gap-4 text-[12px] font-bold text-ink-tertiary">
        <span><span className="text-ink font-black">{profile.games_played}</span> played</span>
        <span><span className="text-ink font-black">{winRate}%</span> win</span>
      </div>
      {isYou && (
        <div className="text-[10px] tracking-[3px] font-black text-accent mt-3">▸ YOU</div>
      )}
    </div>
  );
}

export default function ChallengeLobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [senderProfile, setSenderProfile] = useState<Profile | null>(null);
  const [recipientProfile, setRecipientProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myReady, setMyReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const consecutiveErrorsRef = useRef(0);
  const navigatingToMatchRef = useRef(false);

  // Fetch challenge and profiles
  useEffect(() => {
    if (authLoading) return;

    // Middleware guarantees an authenticated session reaches this page.
    // If useAuth hasn't reconciled yet, stay in the loading state — don't self-redirect.
    if (!user) return;

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

      // If challenge already has an active match, redirect
      if (c.match_id) {
        const { data: match } = await supabase
          .from('matches')
          .select('id, status')
          .eq('id', c.match_id)
          .single();

        if (match?.status === 'active' || match?.status === 'completed') {
          router.replace(`/play/${c.match_id}`);
          return;
        }
      }

      if (c.status !== 'accepted') {
        setError(c.status === 'pending' ? 'Challenge has not been accepted yet' : 'Challenge is no longer available');
        setLoading(false);
        return;
      }

      if (c.sender_id !== user.id && c.recipient_id !== user.id) {
        setError('You are not a participant in this challenge');
        setLoading(false);
        return;
      }

      setChallenge(c);

      const { data: sp } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', c.sender_id)
        .single();
      if (sp) setSenderProfile(sp as Profile);

      if (c.recipient_id) {
        const { data: rp } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', c.recipient_id)
          .single();
        if (rp) setRecipientProfile(rp as Profile);
      }

      setLoading(false);
    };

    fetchChallenge();
  }, [code, user, authLoading, router, supabase]);

  // Navigate to the match — shared by polling and realtime discovery paths.
  // Guarded by navigatingToMatchRef so we never double-redirect if both fire.
  const navigateToMatch = useCallback((matchId: string) => {
    if (navigatingToMatchRef.current) return;
    navigatingToMatchRef.current = true;
    setMyReady(true);
    setOpponentReady(true);
    setStarting(true);
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    router.replace(`/play/${matchId}`);
  }, [router]);

  // Call /api/challenge/start — handles both stages:
  // First player: creates waiting match. Second player: activates it.
  // Same player calling again: returns current status without change.
  const callStart = useCallback(async () => {
    // Prevent overlapping requests
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      const res = await fetch('/api/challenge/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      // Session expired — redirect to login
      if (res.status === 401) {
        if (pollRef.current) clearInterval(pollRef.current);
        router.push(`/login?redirect=/challenge/${code}/lobby`);
        return;
      }

      const data = await res.json();

      // Reset error tracking on any successful response
      consecutiveErrorsRef.current = 0;
      if (connectionError) setConnectionError(false);

      if (data.status === 'active') {
        navigateToMatch(data.matchId);
        return;
      }

      if (data.status === 'waiting') {
        setMyReady(data.myReady ?? true);
        setOpponentReady(data.opponentReady ?? false);
      }

      if (data.error && res.status === 409) {
        // Already in an active match — redirect to it instead of dead-end error
        if (data.matchId) {
          navigateToMatch(data.matchId);
          return;
        }
        setError(data.error);
      }
    } catch {
      consecutiveErrorsRef.current += 1;
      if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
        if (pollRef.current) clearInterval(pollRef.current);
        setConnectionError(true);
      }
    } finally {
      isPollingRef.current = false;
    }
  }, [code, router, connectionError, navigateToMatch]);

  const startPolling = useCallback(() => {
    consecutiveErrorsRef.current = 0;
    setConnectionError(false);
    setTimedOut(false);

    callStart();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(callStart, POLL_INTERVAL_MS);

    // Lobby timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setTimedOut(true);
      if (pollRef.current) clearInterval(pollRef.current);
    }, LOBBY_TIMEOUT_MS);
  }, [callStart]);

  // Register + poll: call start immediately, then every 2s
  useEffect(() => {
    if (!challenge || !user || starting) return;

    startPolling();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Clear heartbeat so the server doesn't think we're still in the lobby.
      // Skip if we're navigating to the match — heartbeat is no longer needed.
      if (challenge && user && !navigatingToMatchRef.current) {
        const col = challenge.sender_id === user.id ? 'sender_ready_at' : 'recipient_ready_at';
        supabase
          .from('challenges')
          .update({ [col]: null })
          .eq('id', challenge.id)
          .then(() => {});
      }
    };
  }, [challenge, user, starting, startPolling, supabase]);

  // Send heartbeat clear via sendBeacon on page unload (more reliable than fetch in cleanup)
  useEffect(() => {
    if (!challenge || !user) return;

    const handleBeforeUnload = () => {
      if (navigatingToMatchRef.current) return;
      const col = challenge.sender_id === user.id ? 'sender_ready_at' : 'recipient_ready_at';
      const payload = JSON.stringify({ challengeId: challenge.id, column: col });
      navigator.sendBeacon('/api/challenge/heartbeat-clear', payload);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [challenge, user]);

  // Send an immediate heartbeat when tab regains focus (handles Safari/mobile throttling)
  useEffect(() => {
    if (!challenge || !user || starting) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isPollingRef.current) {
        callStart();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [challenge, user, starting, callStart]);

  // Realtime: subscribe to this challenge's row so both clients learn about the
  // match_id update within ~100-300ms (instead of waiting up to 2s for the next
  // poll tick). The 2s polling loop above is kept as a fallback for clients
  // where Realtime is flaky — both paths funnel through navigateToMatch, which
  // is guarded by navigatingToMatchRef to prevent double-redirect.
  useEffect(() => {
    if (!challenge || !user || starting) return;

    const channel = supabase
      .channel(`challenge-lobby:${challenge.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'challenges',
          filter: `id=eq.${challenge.id}`,
        },
        async (payload) => {
          const next = payload.new as { match_id: string | null };
          if (!next.match_id || navigatingToMatchRef.current) return;

          // Guard against stale / abandoned matches — fetch current status.
          const { data: match } = await supabase
            .from('matches')
            .select('id, status')
            .eq('id', next.match_id)
            .single();

          if (match && (match.status === 'active' || match.status === 'completed')) {
            navigateToMatch(match.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [challenge, user, starting, supabase, navigateToMatch]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-ink-muted">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="text-feedback-wrong text-[14px] font-semibold">{error}</div>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-accent text-on-accent font-black text-[12px] tracking-[2.5px] rounded-md hover:scale-[1.02] transition-all shadow-[0_4px_20px_var(--accent-glow)]"
        >
          ▸ DASHBOARD
        </button>
      </div>
    );
  }

  if (!challenge || !senderProfile) return null;

  const isUserSender = user?.id === challenge.sender_id;
  const opponentProfile = isUserSender ? recipientProfile : senderProfile;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-4">
      <div className="text-center">
        <div className="text-[11px] tracking-[4px] font-black text-accent mb-2">▸ CHALLENGE LOBBY</div>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-black text-ink leading-none tracking-tight">
          {starting ? 'Starting match…' : 'Waiting for players.'}
        </h1>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-4 w-full max-w-lg">
        <PlayerCard
          profile={isUserSender ? senderProfile : recipientProfile}
          ready={myReady}
          isYou={true}
        />
        <div className="flex items-center justify-center">
          <span className="font-serif text-2xl sm:text-3xl font-black text-accent italic">vs</span>
        </div>
        <PlayerCard
          profile={opponentProfile}
          ready={opponentReady}
          isYou={false}
        />
      </div>

      {/* Connection error banner */}
      {connectionError && (
        <div className="flex flex-col items-center gap-3 px-6 py-5 border-2 border-feedback-wrong/40 rounded-xl bg-feedback-wrong/10">
          <p className="text-feedback-wrong text-[14px] font-semibold">Connection lost. Check your internet and try again.</p>
          <button
            onClick={startPolling}
            className="px-6 py-3 bg-accent text-on-accent font-black text-[12px] tracking-[2.5px] rounded-md hover:scale-[1.02] transition-all shadow-[0_4px_20px_var(--accent-glow)]"
          >
            ▸ RETRY
          </button>
        </div>
      )}

      {/* Lobby timeout */}
      {timedOut && !connectionError && (
        <div className="flex flex-col items-center gap-3 px-6 py-5 border-2 border-edge-strong rounded-xl bg-panel">
          <p className="text-ink-tertiary text-[14px] font-semibold">Your opponent hasn&apos;t joined yet.</p>
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={startPolling}
              className="px-6 py-3 bg-accent text-on-accent font-black text-[12px] tracking-[2.5px] rounded-md hover:scale-[1.02] transition-all shadow-[0_4px_20px_var(--accent-glow)]"
            >
              KEEP WAITING
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 border-2 border-edge-strong text-ink font-black text-[12px] tracking-[2.5px] rounded-md hover:border-edge-bold hover:bg-shade transition-colors"
            >
              DASHBOARD
            </button>
          </div>
        </div>
      )}

      {starting ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border border-edge-strong border-t-ink-secondary rounded-full animate-spin" />
          <p className="text-ink-tertiary text-[13px]">Creating match...</p>
        </div>
      ) : !connectionError && !timedOut ? (
        <div className="text-center">
          <p className="text-ink-muted text-[13px] mb-6">
            {opponentReady
              ? 'Both players are here. Starting...'
              : `Waiting for ${opponentProfile?.display_name || opponentProfile?.username || 'opponent'} to join...`
            }
          </p>
          {!opponentReady && (
            <div className="w-10 h-10 mx-auto border border-edge border-t-ink-tertiary rounded-full animate-spin" />
          )}
        </div>
      ) : null}

      <button
        onClick={() => router.push('/dashboard')}
        className="px-6 py-2 text-[12px] tracking-[1.5px] text-ink-faint hover:text-ink-tertiary transition-colors"
      >
        CANCEL
      </button>
    </div>
  );
}
