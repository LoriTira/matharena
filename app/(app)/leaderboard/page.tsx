'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Profile } from '@/types';

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<Profile[]>([]);
  const [sprintPBs, setSprintPBs] = useState<Record<string, number>>({});
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
      if (data) {
        const profiles = data as Profile[];
        setPlayers(profiles);

        // Batch-fetch sprint PBs for all players
        const playerIds = profiles.map((p) => p.id);
        if (playerIds.length > 0) {
          const { data: sprintData } = await supabase
            .from('practice_sessions')
            .select('user_id, score')
            .in('user_id', playerIds)
            .eq('duration', 120)
            .order('score', { ascending: false });

          if (sprintData) {
            const pbs: Record<string, number> = {};
            for (const s of sprintData as { user_id: string; score: number }[]) {
              if (!(s.user_id in pbs)) {
                pbs[s.user_id] = s.score;
              }
            }
            setSprintPBs(pbs);
          }
        }
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, [filter]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] tracking-[4px] font-black text-accent mb-2">▸ RANKINGS</div>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-black text-ink leading-none tracking-tight">
          Leaderboard.
        </h1>
        <p className="text-[14px] font-medium text-ink-tertiary mt-3">Top players by Elo rating.</p>
      </div>
      <div className="flex justify-end">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by school/company..."
          className="px-4 py-3 bg-card border-2 border-edge-strong rounded-md text-ink font-medium placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent w-full sm:w-72 text-[13px] transition-colors"
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
                <th className="px-4 py-3 text-right text-[11px] tracking-[2px] text-ink-faint">SPRINT PB</th>
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
                  <td className="px-4 py-3"><div className="flex justify-end"><Skeleton className="h-4 w-10" /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border-2 border-edge-strong rounded-xl overflow-x-auto bg-panel">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b-2 border-edge-strong bg-shade">
                <th className="px-4 py-4 text-left text-[11px] tracking-[2.5px] font-black text-ink-tertiary w-16">#</th>
                <th className="px-4 py-4 text-left text-[11px] tracking-[2.5px] font-black text-ink-tertiary">PLAYER</th>
                <th className="px-4 py-4 text-left text-[11px] tracking-[2.5px] font-black text-ink-tertiary">COUNTRY</th>
                <th className="px-4 py-4 text-left text-[11px] tracking-[2.5px] font-black text-ink-tertiary">AFFILIATION</th>
                <th className="px-4 py-4 text-right text-[11px] tracking-[2.5px] font-black text-ink-tertiary">RATING</th>
                <th className="px-4 py-4 text-right text-[11px] tracking-[2.5px] font-black text-ink-tertiary">W/L</th>
                <th className="px-4 py-4 text-right text-[11px] tracking-[2.5px] font-black text-ink-tertiary">WIN %</th>
                <th className="px-4 py-4 text-right text-[11px] tracking-[2.5px] font-black text-ink-tertiary">SPRINT PB</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => {
                const winRate = player.games_played > 0
                  ? Math.round((player.games_won / player.games_played) * 100)
                  : 0;
                const losses = player.games_played - player.games_won;
                const isTop3 = index < 3;

                return (
                  <tr key={player.id} className="border-b border-edge-faint last:border-b-0 hover:bg-shade transition-colors">
                    <td className={`px-4 py-3 font-mono text-[14px] font-black tabular-nums ${isTop3 ? 'text-accent' : 'text-ink-tertiary'}`}>{index + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/profile/${player.id}`}
                        className="text-ink font-bold hover:text-accent text-[14px] transition-colors"
                      >
                        {player.display_name || player.username}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-tertiary text-[13px] font-medium">{player.country ?? '—'}</td>
                    <td className="px-4 py-3 text-ink-tertiary text-[13px] font-medium">{player.affiliation ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-black text-ink tabular-nums text-[14px]">{player.elo_rating}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[13px] tabular-nums">
                      <span className="text-feedback-correct">{player.games_won}</span>
                      <span className="text-ink-faint"> / </span>
                      <span className="text-feedback-wrong">{losses}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-ink-secondary text-[13px] tabular-nums">{winRate}%</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-ink-secondary text-[13px] tabular-nums">{sprintPBs[player.id] ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {players.length === 0 && (
            <div className="text-center py-12 text-ink-tertiary font-semibold">No players found</div>
          )}
        </div>
      )}
    </div>
  );
}
