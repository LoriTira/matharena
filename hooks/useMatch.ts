'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Match } from '@/types';

export function useMatch(matchId: string) {
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Fetch initial match state
    const fetchMatch = async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (!error && data) {
        setMatch(data as Match);
      }
      setLoading(false);
    };

    fetchMatch();

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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  const submitAnswer = useCallback(
    async (problemIndex: number, answer: number) => {
      const res = await fetch('/api/match/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, problemIndex, answer }),
      });
      return res.json();
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

  return { match, loading, submitAnswer, abandonMatch };
}
