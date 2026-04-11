'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GAME_CONFIG } from '@/lib/constants';
import type { Match, MatchStatus } from '@/types';

/**
 * Matchmaking hook — runs the search loop for /play.
 *
 * Responsibilities:
 *   - Poll /api/match/find every 2.5s to create/join a waiting match
 *   - Widen the Elo range every 5s
 *   - Time out after 2 minutes if no opponent found
 *   - Subscribe via Supabase Realtime to the current match id so we learn
 *     about pending_accept → active transitions in under a second (the poll
 *     interval alone would eat ~25% of the 10s accept window for player A)
 *   - Expose acceptMatch() / declineMatch() for the MatchFoundModal
 *   - Track a search cooldown returned by /api/match/find on 429 responses
 *     (caused by a prior decline/timeout). Block search during cooldown.
 */

interface MatchmakingState {
  isSearching: boolean;
  matchId: string | null;
  matchStatus: MatchStatus | null;
  /** Full match row when status is pending_accept (for the modal). */
  pendingMatch: Match | null;
  error: string | null;
  eloRange: number;
  cooldownRemainingMs: number;
  /** True once THIS client has accepted a pending_accept match. */
  selfAccepted: boolean;
}

const INITIAL_STATE: MatchmakingState = {
  isSearching: false,
  matchId: null,
  matchStatus: null,
  pendingMatch: null,
  error: null,
  eloRange: GAME_CONFIG.MATCHMAKING_ELO_RANGE_INITIAL,
  cooldownRemainingMs: 0,
  selfAccepted: false,
};

export function useMatchmaking() {
  const [state, setState] = useState<MatchmakingState>(INITIAL_STATE);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Timers and refs
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const widenRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);
  const matchIdRef = useRef<string | null>(null);
  const eloRangeRef = useRef<number>(GAME_CONFIG.MATCHMAKING_ELO_RANGE_INITIAL);
  const redirectingRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedMatchIdRef = useRef<string | null>(null);

  const clearAllTimers = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (widenRef.current) clearInterval(widenRef.current);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    pollRef.current = null;
    timeoutRef.current = null;
    widenRef.current = null;
    cooldownRef.current = null;
  }, []);

  const unsubscribeRealtime = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      subscribedMatchIdRef.current = null;
    }
  }, [supabase]);

  /** Redirect to the active match page, cleaning up all state. */
  const enterActiveMatch = useCallback(
    (matchId: string) => {
      if (redirectingRef.current) return;
      redirectingRef.current = true;
      clearAllTimers();
      unsubscribeRealtime();
      setState((s) => ({ ...s, isSearching: false }));
      router.push(`/play/${matchId}`);
    },
    [clearAllTimers, unsubscribeRealtime, router]
  );

  /** Handle a match row update from either Realtime or a poll refetch. */
  const handleMatchUpdate = useCallback(
    (m: Match) => {
      matchIdRef.current = m.id;
      setState((s) => ({
        ...s,
        matchId: m.id,
        matchStatus: m.status,
        pendingMatch: m.status === 'pending_accept' ? m : null,
      }));

      if (m.status === 'active') {
        enterActiveMatch(m.id);
      } else if (m.status === 'abandoned') {
        // Opponent declined or the match was swept stale. Reset and resume
        // searching; the caller of findMatch() typically handles this.
        setState((s) => ({
          ...s,
          pendingMatch: null,
          matchStatus: 'abandoned',
          selfAccepted: false,
        }));
      }
    },
    [enterActiveMatch]
  );

  /** Subscribe to Realtime updates for a specific match id (idempotent). */
  const subscribeToMatch = useCallback(
    (matchId: string) => {
      if (subscribedMatchIdRef.current === matchId) return;
      unsubscribeRealtime();

      const channel = supabase
        .channel(`matchmaking:${matchId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'matches',
            filter: `id=eq.${matchId}`,
          },
          (payload) => {
            handleMatchUpdate(payload.new as Match);
          }
        )
        .subscribe();

      channelRef.current = channel;
      subscribedMatchIdRef.current = matchId;
    },
    [supabase, unsubscribeRealtime, handleMatchUpdate]
  );

  /** Start a cooldown countdown; disables search while counting. */
  const startCooldown = useCallback(
    (remainingMs: number) => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      setState((s) => ({ ...s, cooldownRemainingMs: remainingMs }));
      const startedAt = Date.now();
      cooldownRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const left = Math.max(0, remainingMs - elapsed);
        setState((s) => ({ ...s, cooldownRemainingMs: left }));
        if (left <= 0 && cooldownRef.current) {
          clearInterval(cooldownRef.current);
          cooldownRef.current = null;
        }
      }, 100);
    },
    []
  );

  /** Start (or resume) the matchmaking search loop. */
  const findMatch = useCallback(async () => {
    // Refuse to start if a cooldown is still active.
    if (state.cooldownRemainingMs > 0) return;

    setState((s) => ({
      ...s,
      isSearching: true,
      error: null,
      selfAccepted: false,
      eloRange: GAME_CONFIG.MATCHMAKING_ELO_RANGE_INITIAL,
    }));
    redirectingRef.current = false;
    eloRangeRef.current = GAME_CONFIG.MATCHMAKING_ELO_RANGE_INITIAL;

    const poll = async () => {
      if (redirectingRef.current) return;

      try {
        const res = await fetch('/api/match/find', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eloRange: eloRangeRef.current }),
        });

        const data = await res.json();

        if (res.status === 429 && data.cooldownRemainingMs) {
          // Mid-search cooldown (rare — would require a stale client state).
          // Stop searching and start the cooldown countdown.
          clearAllTimers();
          setState((s) => ({
            ...s,
            isSearching: false,
            error: 'Search cooldown active — please wait.',
          }));
          startCooldown(data.cooldownRemainingMs);
          return;
        }

        if (!res.ok) {
          console.error('Matchmaking poll error:', data.error);
          return;
        }

        matchIdRef.current = data.matchId;

        // Subscribe to Realtime for this match id as soon as we know it.
        // This collapses the ~2.5s polling latency down to <1s for the
        // waiting → pending_accept transition (critical for the 10s accept
        // window).
        if (data.matchId) subscribeToMatch(data.matchId);

        setState((s) => ({
          ...s,
          matchId: data.matchId,
          matchStatus: data.status as MatchStatus,
        }));

        if (data.status === 'active') {
          // Already active (edge case: this client reconnected into an
          // existing active match). Redirect.
          enterActiveMatch(data.matchId);
        } else if (data.status === 'pending_accept') {
          // Pending accept — fetch the full row so the modal can render.
          // Poll loop stays running as a fallback in case Realtime is slow,
          // but the modal will drive UX.
          const { data: full } = await supabase
            .from('matches')
            .select('*')
            .eq('id', data.matchId)
            .maybeSingle();
          if (full) handleMatchUpdate(full as Match);
        }
      } catch (err) {
        console.error('Matchmaking poll network error:', err);
      }
    };

    // Call immediately
    await poll();
    if (redirectingRef.current) return;

    // Poll every 2.5s via server API (Realtime handles sub-second updates)
    pollRef.current = setInterval(poll, 2500);

    // Widen Elo range every 5s to find more opponents
    widenRef.current = setInterval(() => {
      const newRange = Math.min(
        eloRangeRef.current + 50,
        GAME_CONFIG.MATCHMAKING_ELO_RANGE_MAX
      );
      eloRangeRef.current = newRange;
      setState((s) => ({ ...s, eloRange: newRange }));
    }, GAME_CONFIG.MATCHMAKING_WIDEN_INTERVAL_MS);

    // Timeout after 2 minutes
    timeoutRef.current = setTimeout(() => {
      clearAllTimers();
      unsubscribeRealtime();
      setState((s) => ({
        ...s,
        isSearching: false,
        error: 'No opponent found. Try again later.',
      }));
      const mid = matchIdRef.current;
      if (mid) {
        fetch('/api/match/abandon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId: mid }),
        }).catch(() => {});
      }
    }, GAME_CONFIG.MATCHMAKING_TIMEOUT_MS);
  }, [
    state.cooldownRemainingMs,
    clearAllTimers,
    unsubscribeRealtime,
    subscribeToMatch,
    enterActiveMatch,
    handleMatchUpdate,
    startCooldown,
    supabase,
  ]);

  /** Cancel search, abandon any waiting/pending match. */
  const cancel = useCallback(async () => {
    clearAllTimers();
    unsubscribeRealtime();
    const mid = matchIdRef.current;
    matchIdRef.current = null;
    redirectingRef.current = false;
    setState(INITIAL_STATE);

    if (mid) {
      await fetch('/api/match/abandon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: mid }),
      }).catch(() => {});
    }
  }, [clearAllTimers, unsubscribeRealtime]);

  /** Accept a pending_accept match. Called from the MatchFoundModal. */
  const acceptMatch = useCallback(async () => {
    const mid = matchIdRef.current;
    if (!mid) return;

    setState((s) => ({ ...s, selfAccepted: true }));

    try {
      const res = await fetch('/api/match/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: mid }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Surface the error — the modal will close once state.matchStatus
        // clears or we roll back selfAccepted.
        setState((s) => ({
          ...s,
          selfAccepted: false,
          error: data.error ?? 'Failed to accept match',
        }));
        return;
      }

      if (data.status === 'active') {
        // Both accepted — Realtime should fire too, but we can proactively
        // transition to keep the UI snappy.
        enterActiveMatch(data.matchId);
      }
      // If status is still pending_accept, we're waiting on the other side;
      // the Realtime subscription will drive the next update.
    } catch (err) {
      console.error('Accept match error:', err);
      setState((s) => ({
        ...s,
        selfAccepted: false,
        error: 'Network error accepting match',
      }));
    }
  }, [enterActiveMatch]);

  /** Decline a pending_accept match (or handle timeout). */
  const declineMatch = useCallback(
    async (reason: 'declined' | 'timeout' = 'declined') => {
      const mid = matchIdRef.current;
      if (!mid) return;

      // Optimistically stop searching and clear modal state. Do NOT start the
      // cooldown yet — only start it if the server actually inserted one.
      // The server returns { alreadyResolved: true } if the match was already
      // abandoned (e.g. the opponent timed out first), in which case this
      // client is just catching up and should NOT be penalized.
      clearAllTimers();
      unsubscribeRealtime();
      matchIdRef.current = null;
      setState((s) => ({
        ...s,
        isSearching: false,
        matchId: null,
        matchStatus: null,
        pendingMatch: null,
        selfAccepted: false,
      }));

      try {
        const res = await fetch('/api/match/decline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId: mid, reason }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && !data.alreadyResolved) {
          // Server accepted the decline and inserted a cooldown row.
          startCooldown(GAME_CONFIG.MATCH_DECLINE_COOLDOWN_MS);
        }
      } catch (err) {
        console.error('Decline match error:', err);
      }
    },
    [clearAllTimers, unsubscribeRealtime, startCooldown]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
      unsubscribeRealtime();
    };
  }, [clearAllTimers, unsubscribeRealtime]);

  return {
    // State
    isSearching: state.isSearching,
    matchId: state.matchId,
    matchStatus: state.matchStatus,
    pendingMatch: state.pendingMatch,
    error: state.error,
    eloRange: state.eloRange,
    cooldownRemainingMs: state.cooldownRemainingMs,
    selfAccepted: state.selfAccepted,
    // Actions
    findMatch,
    cancel,
    acceptMatch,
    declineMatch,
  };
}
