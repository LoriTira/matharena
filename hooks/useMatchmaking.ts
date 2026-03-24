'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { GAME_CONFIG } from '@/lib/constants';

export function useMatchmaking() {
  const [isSearching, setIsSearching] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const widenRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (widenRef.current) clearTimeout(widenRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    timeoutRef.current = null;
    widenRef.current = null;
    pollRef.current = null;
    channelRef.current = null;
  }, []);

  const findMatch = useCallback(async () => {
    setIsSearching(true);
    setError(null);

    try {
      const res = await fetch('/api/match/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to find match');
      }

      setMatchId(data.matchId);

      if (data.status === 'active') {
        // Match found immediately
        cleanup();
        setIsSearching(false);
        router.push(`/play/${data.matchId}`);
        return;
      }

      // Status is 'waiting' — subscribe to updates
      const channel = supabase
        .channel(`matchmaking:${data.matchId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'matches',
            filter: `id=eq.${data.matchId}`,
          },
          (payload) => {
            if (payload.new.status === 'active') {
              cleanup();
              setIsSearching(false);
              router.push(`/play/${data.matchId}`);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;

      // Polling fallback: check match status every 2s in case realtime misses the update
      pollRef.current = setInterval(async () => {
        try {
          const { data: m } = await supabase
            .from('matches')
            .select('id, status')
            .eq('id', data.matchId)
            .single();

          if (m?.status === 'active') {
            cleanup();
            setIsSearching(false);
            router.push(`/play/${data.matchId}`);
          }
        } catch {
          // Will retry on next poll
        }
      }, 2000);

      // Timeout after 2 minutes
      timeoutRef.current = setTimeout(() => {
        cleanup();
        setIsSearching(false);
        setError('No opponent found. Try again later.');
        // Abandon the waiting match
        fetch('/api/match/abandon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId: data.matchId }),
        });
      }, GAME_CONFIG.MATCHMAKING_TIMEOUT_MS);
    } catch (err) {
      setIsSearching(false);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [router, cleanup]);

  const cancel = useCallback(async () => {
    cleanup();
    setIsSearching(false);
    if (matchId) {
      await fetch('/api/match/abandon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      });
    }
    setMatchId(null);
  }, [matchId, cleanup]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return { isSearching, matchId, error, findMatch, cancel };
}
