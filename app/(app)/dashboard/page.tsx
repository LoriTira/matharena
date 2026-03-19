'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import type { Profile, Match } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) setProfile(profileData as Profile);

      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(5);

      if (matchData) setRecentMatches(matchData as Match[]);
    };

    fetchData();
  }, [user]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, <span className="text-blue-400">{profile.display_name || profile.username}</span>
        </h1>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="text-sm text-gray-400">Elo Rating</div>
          <div className="text-3xl font-bold text-white mt-1">{profile.elo_rating}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="text-sm text-gray-400">Games Played</div>
          <div className="text-3xl font-bold text-white mt-1">{profile.games_played}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="text-sm text-gray-400">Wins</div>
          <div className="text-3xl font-bold text-green-400 mt-1">{profile.games_won}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="text-sm text-gray-400">Win Rate</div>
          <div className="text-3xl font-bold text-white mt-1">{winRate}%</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/play"
          className="bg-blue-600 hover:bg-blue-500 rounded-xl p-8 text-center transition-colors group"
        >
          <div className="text-4xl mb-3">⚔️</div>
          <div className="text-xl font-bold text-white">Ranked Match</div>
          <div className="text-blue-200 mt-1">Compete and climb the ranks</div>
        </Link>
        <Link
          href="/practice"
          className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-8 text-center transition-colors group"
        >
          <div className="text-4xl mb-3">🎯</div>
          <div className="text-xl font-bold text-white">Practice</div>
          <div className="text-gray-400 mt-1">Train without affecting your rating</div>
        </Link>
        <Link
          href="/lessons"
          className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-8 text-center transition-colors group"
        >
          <div className="text-4xl mb-3">📚</div>
          <div className="text-xl font-bold text-white">Lessons</div>
          <div className="text-gray-400 mt-1">Learn mental math tricks</div>
        </Link>
      </div>

      {/* Recent matches */}
      {recentMatches.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Recent Matches</h2>
          <div className="space-y-2">
            {recentMatches.map((match) => {
              const isPlayer1 = match.player1_id === user?.id;
              const won = match.winner_id === user?.id;
              const myScore = isPlayer1 ? match.player1_score : match.player2_score;
              const theirScore = isPlayer1 ? match.player2_score : match.player1_score;
              const eloChange = isPlayer1
                ? (match.player1_elo_after ?? 0) - (match.player1_elo_before ?? 0)
                : (match.player2_elo_after ?? 0) - (match.player2_elo_before ?? 0);

              return (
                <div
                  key={match.id}
                  className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>
                      {won ? 'WIN' : 'LOSS'}
                    </span>
                    <span className="text-white">{myScore} - {theirScore}</span>
                  </div>
                  <span className={`font-mono ${eloChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {eloChange >= 0 ? '+' : ''}{eloChange}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
