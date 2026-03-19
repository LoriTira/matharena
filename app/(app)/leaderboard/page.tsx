'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
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
        <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by school/company..."
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading rankings...</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 w-16">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Player</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Affiliation</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Rating</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">W/L</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Win %</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => {
                const winRate = player.games_played > 0
                  ? Math.round((player.games_won / player.games_played) * 100)
                  : 0;
                const losses = player.games_played - player.games_won;

                return (
                  <tr key={player.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-gray-500 font-mono">{index + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/profile/${player.id}`}
                        className="text-white hover:text-blue-400 font-medium transition-colors"
                      >
                        {player.display_name || player.username}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{player.affiliation ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-white tabular-nums">{player.elo_rating}</td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums">
                      <span className="text-green-400">{player.games_won}</span>
                      <span className="text-gray-600"> / </span>
                      <span className="text-red-400">{losses}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300 tabular-nums">{winRate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {players.length === 0 && (
            <div className="text-center py-12 text-gray-500">No players found</div>
          )}
        </div>
      )}
    </div>
  );
}
