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
  const [opponentNames, setOpponentNames] = useState<Record<string, string>>({});
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

      if (matchData) {
        const matches = matchData as Match[];
        setRecentMatches(matches);

        // Fetch opponent names
        const opponentIds = matches.map(m =>
          m.player1_id === user.id ? m.player2_id : m.player1_id
        ).filter((id): id is string => id !== null);

        if (opponentIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, display_name')
            .in('id', opponentIds);

          if (profiles) {
            const names: Record<string, string> = {};
            for (const p of profiles) {
              names[p.id] = p.display_name || p.username;
            }
            setOpponentNames(names);
          }
        }
      }
    };

    fetchData();
  }, [user]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-white/25">Loading...</div>
      </div>
    );
  }

  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0;

  return (
    <div className="space-y-10">
      {/* Greeting */}
      <div>
        <h1 className="font-serif text-[28px] font-light text-white/85">
          Good evening, {profile.display_name || profile.username}
        </h1>
        <p className="text-[13px] text-white/25 mt-1">Your mind is your weapon. Keep it sharp.</p>
      </div>

      {/* Stats grid — 1px gap separators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.04] rounded-sm overflow-hidden">
        <div className="bg-[#050505] p-6">
          <div className="text-[9px] tracking-[2px] text-white/20 mb-2">RATING</div>
          <div className="font-mono text-[28px] font-normal text-white/[0.88] tabular-nums">{profile.elo_rating}</div>
        </div>
        <div className="bg-[#050505] p-6">
          <div className="text-[9px] tracking-[2px] text-white/20 mb-2">PLAYED</div>
          <div className="font-mono text-[28px] font-normal text-white/[0.88] tabular-nums">{profile.games_played}</div>
        </div>
        <div className="bg-[#050505] p-6">
          <div className="text-[9px] tracking-[2px] text-white/20 mb-2">WINS</div>
          <div className="font-mono text-[28px] font-normal text-white/[0.88] tabular-nums">{profile.games_won}</div>
        </div>
        <div className="bg-[#050505] p-6">
          <div className="text-[9px] tracking-[2px] text-white/20 mb-2">WIN RATE</div>
          <div className="font-mono text-[28px] font-normal text-white/[0.88] tabular-nums">{winRate}%</div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <div className="text-[9px] tracking-[3px] text-white/20 mb-4">QUICK ACTIONS</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link
            href="/play"
            className="border border-white/[0.06] rounded-sm p-6 bg-white/[0.015] hover:border-white/[0.12] transition-colors group"
          >
            <div className="font-serif text-2xl italic text-white/50 mb-3">&times;</div>
            <div className="font-serif text-base text-white/80 mb-1">Ranked Match</div>
            <div className="text-[11px] text-white/25 leading-relaxed">Find an opponent at your skill level</div>
          </Link>
          <Link
            href="/practice"
            className="border border-white/[0.06] rounded-sm p-6 bg-white/[0.015] hover:border-white/[0.12] transition-colors group"
          >
            <div className="font-serif text-2xl italic text-white/50 mb-3">&radic;</div>
            <div className="font-serif text-base text-white/80 mb-1">Practice</div>
            <div className="text-[11px] text-white/25 leading-relaxed">Train without pressure</div>
          </Link>
          <Link
            href="/lessons"
            className="border border-white/[0.06] rounded-sm p-6 bg-white/[0.015] hover:border-white/[0.12] transition-colors group"
          >
            <div className="font-serif text-2xl italic text-white/50 mb-3">&int;</div>
            <div className="font-serif text-base text-white/80 mb-1">Lessons</div>
            <div className="text-[11px] text-white/25 leading-relaxed">Learn mental math techniques</div>
          </Link>
        </div>
      </div>

      {/* Recent matches */}
      {recentMatches.length > 0 && (
        <div>
          <div className="text-[9px] tracking-[3px] text-white/20 mb-4">RECENT MATCHES</div>
          <div className="border border-white/[0.04] rounded-sm overflow-hidden">
            {recentMatches.map((match) => {
              const isPlayer1 = match.player1_id === user?.id;
              const won = match.winner_id === user?.id;
              const myScore = isPlayer1 ? match.player1_score : match.player2_score;
              const theirScore = isPlayer1 ? match.player2_score : match.player1_score;
              const eloChange = isPlayer1
                ? (match.player1_elo_after ?? 0) - (match.player1_elo_before ?? 0)
                : (match.player2_elo_after ?? 0) - (match.player2_elo_before ?? 0);
              const opponentId = isPlayer1 ? match.player2_id : match.player1_id;
              const opponentName = opponentId ? opponentNames[opponentId] ?? 'Opponent' : 'Opponent';

              return (
                <div
                  key={match.id}
                  className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.03] last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-[10px] tracking-[1px] px-2 py-0.5 rounded-sm ${
                      won
                        ? 'text-white/70 bg-white/[0.08]'
                        : 'text-white/25 bg-white/[0.03]'
                    }`}>
                      {won ? 'W' : 'L'}
                    </span>
                    <span className="text-[13px] text-white/60">vs {opponentName}</span>
                  </div>
                  <div className="font-mono text-xs text-white/30 tabular-nums">{myScore} &ndash; {theirScore}</div>
                  <div className={`font-mono text-[11px] tabular-nums ${
                    eloChange >= 0 ? 'text-white/50' : 'text-white/20'
                  }`}>
                    {eloChange >= 0 ? '+' : ''}{eloChange}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
