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
        <h1 className="font-serif text-3xl font-light text-white/90">Leaderboard</h1>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by school/company..."
          className="px-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-sm text-white/70 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/15 w-64 text-sm transition-colors"
        />
      </div>

      {loading ? (
        <div className="border border-white/[0.04] rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left text-[9px] tracking-[2px] text-white/20 w-16">#</th>
                <th className="px-4 py-3 text-left text-[9px] tracking-[2px] text-white/20">PLAYER</th>
                <th className="px-4 py-3 text-left text-[9px] tracking-[2px] text-white/20">COUNTRY</th>
                <th className="px-4 py-3 text-left text-[9px] tracking-[2px] text-white/20">AFFILIATION</th>
                <th className="px-4 py-3 text-right text-[9px] tracking-[2px] text-white/20">RATING</th>
                <th className="px-4 py-3 text-right text-[9px] tracking-[2px] text-white/20">W/L</th>
                <th className="px-4 py-3 text-right text-[9px] tracking-[2px] text-white/20">WIN %</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-white/[0.03]">
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
        <div className="border border-white/[0.04] rounded-sm overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left text-[9px] tracking-[2px] text-white/20 w-16">#</th>
                <th className="px-4 py-3 text-left text-[9px] tracking-[2px] text-white/20">PLAYER</th>
                <th className="px-4 py-3 text-left text-[9px] tracking-[2px] text-white/20">COUNTRY</th>
                <th className="px-4 py-3 text-left text-[9px] tracking-[2px] text-white/20">AFFILIATION</th>
                <th className="px-4 py-3 text-right text-[9px] tracking-[2px] text-white/20">RATING</th>
                <th className="px-4 py-3 text-right text-[9px] tracking-[2px] text-white/20">W/L</th>
                <th className="px-4 py-3 text-right text-[9px] tracking-[2px] text-white/20">WIN %</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => {
                const winRate = player.games_played > 0
                  ? Math.round((player.games_won / player.games_played) * 100)
                  : 0;
                const losses = player.games_played - player.games_won;

                return (
                  <tr key={player.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-white/25 text-sm tabular-nums">{index + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/profile/${player.id}`}
                        className="text-white/70 hover:text-white/95 text-sm transition-colors"
                      >
                        {player.display_name || player.username}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-white/25 text-sm">{player.country ?? '—'}</td>
                    <td className="px-4 py-3 text-white/25 text-sm">{player.affiliation ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-white/80 tabular-nums text-sm">{player.elo_rating}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums">
                      <span className="text-white/60">{player.games_won}</span>
                      <span className="text-white/15"> / </span>
                      <span className="text-white/30">{losses}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white/40 text-sm tabular-nums">{winRate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {players.length === 0 && (
            <div className="text-center py-12 text-white/20">No players found</div>
          )}
        </div>
      )}
    </div>
  );
}
