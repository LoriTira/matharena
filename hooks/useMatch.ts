'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Match } from '@/types';

export function useMatch(matchId: string) {
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const statusRef = useRef<string | undefined>(undefined);

  // Keep ref in sync so the polling interval always sees current status
  useEffect(() => {
    statusRef.current = match?.status;
  }, [match?.status]);

  const refetchMatch = useCallback(async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (!error && data) {
      setMatch(data as Match);
    }
  }, [matchId, supabase]);

  useEffect(() => {
    const fetchInitial = async () => {
      await refetchMatch();
      setLoading(false);
    };

    fetchInitial();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          setMatch(payload.new as Match);
        }
      )
      .subscribe();

    // Polling fallback: re-fetch every 1.5s while match is active.
    // Realtime can be unreliable; this guarantees the loser's UI updates.
    const pollInterval = setInterval(async () => {
      if (statusRef.current === 'active' || statusRef.current === 'waiting') {
        const { data } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .single();

        if (data) {
          setMatch(data as Match);
        }
      }
    }, 1500);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [matchId, refetchMatch, supabase]);

  const submitAnswer = useCallback(
    async (problemIndex: number, answer: number) => {
      const res = await fetch('/api/match/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, problemIndex, answer }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || 'Request failed', ...data };
      }
      return data;
    },
    [matchId]
  );

  const abandonMatch = useCallback(async () => {
    const res = await fetch('/api/match/abandon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId }),
    });
    return res.json();
  }, [matchId]);

  return { match, loading, submitAnswer, abandonMatch, refetchMatch };
}
