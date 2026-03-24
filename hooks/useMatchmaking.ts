'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GAME_CONFIG } from '@/lib/constants';

export function useMatchmaking() {
  const [isSearching, setIsSearching] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eloRange, setEloRange] = useState<number>(GAME_CONFIG.MATCHMAKING_ELO_RANGE_INITIAL);
  const router = useRouter();

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const widenRef = useRef<NodeJS.Timeout | null>(null);
  const matchIdRef = useRef<string | null>(null);
  const eloRangeRef = useRef<number>(GAME_CONFIG.MATCHMAKING_ELO_RANGE_INITIAL);
  const redirectingRef = useRef(false);

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (widenRef.current) clearInterval(widenRef.current);
    pollRef.current = null;
    timeoutRef.current = null;
    widenRef.current = null;
  }, []);

  const findMatch = useCallback(async () => {
    setIsSearching(true);
    setError(null);
    redirectingRef.current = false;
    eloRangeRef.current = GAME_CONFIG.MATCHMAKING_ELO_RANGE_INITIAL;
    setEloRange(GAME_CONFIG.MATCHMAKING_ELO_RANGE_INITIAL);

    const poll = async () => {
      if (redirectingRef.current) return;

      try {
        const res = await fetch('/api/match/find', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eloRange: eloRangeRef.current }),
        });

        const data = await res.json();

        if (!res.ok) {
          // Don't stop on transient errors — just log and retry next poll
          console.error('Matchmaking poll error:', data.error);
          return;
        }

        matchIdRef.current = data.matchId;
        setMatchId(data.matchId);

        if (data.status === 'active') {
          redirectingRef.current = true;
          cleanup();
          setIsSearching(false);
          router.push(`/play/${data.matchId}`);
        }
      } catch (err) {
        console.error('Matchmaking poll network error:', err);
      }
    };

    // Call immediately
    await poll();

    // If already matched, don't start intervals
    if (redirectingRef.current) return;

    // Poll every 2.5s via server API (no Realtime dependency)
    pollRef.current = setInterval(poll, 2500);

    // Widen Elo range every 5s to find more opponents
    widenRef.current = setInterval(() => {
      const newRange = Math.min(
        eloRangeRef.current + 50,
        GAME_CONFIG.MATCHMAKING_ELO_RANGE_MAX
      );
      eloRangeRef.current = newRange;
      setEloRange(newRange);
    }, GAME_CONFIG.MATCHMAKING_WIDEN_INTERVAL_MS);

    // Timeout after 2 minutes
    timeoutRef.current = setTimeout(() => {
      cleanup();
      setIsSearching(false);
      setError('No opponent found. Try again later.');
      const mid = matchIdRef.current;
      if (mid) {
        fetch('/api/match/abandon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId: mid }),
        }).catch(() => {});
      }
    }, GAME_CONFIG.MATCHMAKING_TIMEOUT_MS);
  }, [router, cleanup]);

  const cancel = useCallback(async () => {
    cleanup();
    setIsSearching(false);
    const mid = matchIdRef.current;
    matchIdRef.current = null;
    setMatchId(null);
    if (mid) {
      await fetch('/api/match/abandon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: mid }),
      }).catch(() => {});
    }
  }, [cleanup]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return { isSearching, matchId, error, eloRange, findMatch, cancel };
}
