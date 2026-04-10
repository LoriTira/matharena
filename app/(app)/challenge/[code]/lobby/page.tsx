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
    <div className={`border rounded-sm p-6 flex-1 min-w-[200px] transition-colors ${
      isYou ? 'border-edge-strong bg-card' : 'border-edge bg-card'
    }`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full transition-colors ${ready ? 'bg-green-400/80' : 'bg-edge'}`} />
        <span className="text-[11px] tracking-[2px] text-ink-muted">
          {ready ? 'READY' : 'WAITING'}
        </span>
      </div>
      <div className="font-serif text-lg text-ink mb-1 truncate">
        {profile.display_name || profile.username}
      </div>
      <div className="font-mono text-sm text-ink-muted mb-3">
        Elo {profile.elo_rating.toLocaleString()}
      </div>
      <div className="flex gap-4 text-[11px] text-ink-faint">
        <span>{profile.games_played} played</span>
        <span>{winRate}% win</span>
      </div>
      {isYou && (
        <div className="text-[11px] tracking-[1.5px] text-ink-faint mt-3">YOU</div>
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
        setMyReady(true);
        setOpponentReady(true);
        setStarting(true);
        navigatingToMatchRef.current = true;
        if (pollRef.current) clearInterval(pollRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        router.replace(`/play/${data.matchId}`);
        return;
      }

      if (data.status === 'waiting') {
        setMyReady(data.myReady ?? true);
        setOpponentReady(data.opponentReady ?? false);
      }

      if (data.error && res.status === 409) {
        // Already in an active match — redirect to it instead of dead-end error
        if (data.matchId) {
          if (pollRef.current) clearInterval(pollRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          router.replace(`/play/${data.matchId}`);
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
  }, [code, router, connectionError]);

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

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-ink-muted">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-red-400/60 text-sm">{error}</div>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-2.5 border border-edge text-ink-tertiary text-[12px] tracking-[1.5px] rounded-sm hover:border-edge-strong hover:text-ink-secondary transition-colors"
        >
          DASHBOARD
        </button>
      </div>
    );
  }

  if (!challenge || !senderProfile) return null;

  const isUserSender = user?.id === challenge.sender_id;
  const opponentProfile = isUserSender ? recipientProfile : senderProfile;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center">
        <div className="text-[11px] tracking-[3px] text-ink-faint mb-2">CHALLENGE LOBBY</div>
        <h1 className="font-serif text-3xl font-normal text-ink">
          {starting ? 'Starting match...' : 'Waiting for players'}
        </h1>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch gap-4 w-full max-w-lg">
        <PlayerCard
          profile={isUserSender ? senderProfile : recipientProfile}
          ready={myReady}
          isYou={true}
        />
        <div className="flex items-center justify-center">
          <span className="font-serif text-xl text-ink-faint italic">vs</span>
        </div>
        <PlayerCard
          profile={opponentProfile}
          ready={opponentReady}
          isYou={false}
        />
      </div>

      {/* Connection error banner */}
      {connectionError && (
        <div className="flex flex-col items-center gap-3 px-6 py-4 border border-red-400/30 rounded-sm bg-red-400/5">
          <p className="text-red-400/70 text-[13px]">Connection lost. Check your internet and try again.</p>
          <button
            onClick={startPolling}
            className="px-6 py-2 bg-btn text-btn-text font-semibold text-[12px] tracking-[1.5px] rounded-sm hover:bg-btn-hover transition-colors"
          >
            RETRY
          </button>
        </div>
      )}

      {/* Lobby timeout */}
      {timedOut && !connectionError && (
        <div className="flex flex-col items-center gap-3 px-6 py-4 border border-edge rounded-sm">
          <p className="text-ink-muted text-[13px]">Your opponent hasn&apos;t joined yet.</p>
          <div className="flex gap-3">
            <button
              onClick={startPolling}
              className="px-6 py-2 bg-btn text-btn-text font-semibold text-[12px] tracking-[1.5px] rounded-sm hover:bg-btn-hover transition-colors"
            >
              KEEP WAITING
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 border border-edge text-ink-tertiary text-[12px] tracking-[1.5px] rounded-sm hover:border-edge-strong hover:text-ink-secondary transition-colors"
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
