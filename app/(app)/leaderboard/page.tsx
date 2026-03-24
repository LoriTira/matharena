'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Profile } from '@/types';

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const supabase = createClient();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('elo_rating', { ascending: false })
        .limit(100);

      if (filter) {
        query = query.ilike('affiliation', `%${filter}%`);
      }

      const { data } = await query;
      if (data) setPlayers(data as Profile[]);
      setLoading(false);
    };

    fetchLeaderboard();
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-normal text-ink">Leaderboard</h1>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by school/company..."
          className="px-4 py-2 bg-card border border-edge rounded-sm text-ink-secondary placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-edge-strong focus:border-edge-strong w-64 text-sm transition-colors"
        />
      </div>

      {loading ? (
        <div className="border border-edge-faint rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-edge">
                <th className="px-4 py-3 text-left text-[11px] tracking-[2px] text-ink-faint w-16">#</th>
                <th className="px-4 py-3 text-left text-[11px] tracking-[2px] text-ink-faint">PLAYER</th>
                <th className="px-4 py-3 text-left text-[11px] tracking-[2px] text-ink-faint">COUNTRY</th>
                <th className="px-4 py-3 text-left text-[11px] tracking-[2px] text-ink-faint">AFFILIATION</th>
                <th className="px-4 py-3 text-right text-[11px] tracking-[2px] text-ink-faint">RATING</th>
                <th className="px-4 py-3 text-right text-[11px] tracking-[2px] text-ink-faint">W/L</th>
                <th className="px-4 py-3 text-right text-[11px] tracking-[2px] text-ink-faint">WIN %</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-edge-faint">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-6" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3 flex justify-end"><Skeleton className="h-4 w-12" /></td>
                  <td className="px-4 py-3"><div className="flex justify-end"><Skeleton className="h-4 w-14" /></div></td>
                  <td className="px-4 py-3"><div className="flex justify-end"><Skeleton className="h-4 w-10" /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-edge-faint rounded-sm overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-edge">
                <th className="px-4 py-3 text-left text-[11px] tracking-[2px] text-ink-faint w-16">#</th>
                <th className="px-4 py-3 text-left text-[11px] tracking-[2px] text-ink-faint">PLAYER</th>
                <th className="px-4 py-3 text-left text-[11px] tracking-[2px] text-ink-faint">COUNTRY</th>
                <th className="px-4 py-3 text-left text-[11px] tracking-[2px] text-ink-faint">AFFILIATION</th>
                <th className="px-4 py-3 text-right text-[11px] tracking-[2px] text-ink-faint">RATING</th>
                <th className="px-4 py-3 text-right text-[11px] tracking-[2px] text-ink-faint">W/L</th>
                <th className="px-4 py-3 text-right text-[11px] tracking-[2px] text-ink-faint">WIN %</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => {
                const winRate = player.games_played > 0
                  ? Math.round((player.games_won / player.games_played) * 100)
                  : 0;
                const losses = player.games_played - player.games_won;

                return (
                  <tr key={player.id} className="border-b border-edge-faint hover:bg-card transition-colors">
                    <td className="px-4 py-3 font-mono text-ink-muted text-sm tabular-nums">{index + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/profile/${player.id}`}
                        className="text-ink-secondary hover:text-ink text-sm transition-colors"
                      >
                        {player.display_name || player.username}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-muted text-sm">{player.country ?? '—'}</td>
                    <td className="px-4 py-3 text-ink-muted text-sm">{player.affiliation ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-ink tabular-nums text-sm">{player.elo_rating}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums">
                      <span className="text-ink-secondary">{player.games_won}</span>
                      <span className="text-ink-faint"> / </span>
                      <span className="text-ink-muted">{losses}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-ink-tertiary text-sm tabular-nums">{winRate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {players.length === 0 && (
            <div className="text-center py-12 text-ink-faint">No players found</div>
          )}
        </div>
      )}
    </div>
  );
}
