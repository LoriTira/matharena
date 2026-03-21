'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { ChallengeModal } from '@/components/challenge/ChallengeModal';
import type { Profile, Match, Challenge } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [opponentNames, setOpponentNames] = useState<Record<string, string>>({});
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeProfiles, setChallengeProfiles] = useState<Record<string, { username: string; display_name: string | null; elo_rating: number; games_won: number; games_played: number }>>({});
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const supabase = createClient();

  const fetchChallenges = useCallback(async () => {
    try {
      const res = await fetch('/api/challenge/list');
      if (!res.ok) return;
      const data = await res.json();
      setChallenges(data.challenges ?? []);
      setChallengeProfiles(data.profiles ?? {});
    } catch {
      // Silently fail
    }
  }, []);

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
    fetchChallenges();
  }, [user]);

  const handleDecline = async (challengeCode: string) => {
    try {
      await fetch('/api/challenge/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: challengeCode, decline: true }),
      });
      fetchChallenges();
    } catch {
      // Silently fail
    }
  };

  const handleAccept = async (challengeCode: string) => {
    try {
      const res = await fetch('/api/challenge/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: challengeCode }),
      });
      if (res.ok) {
        fetchChallenges();
      }
    } catch {
      // Silently fail
    }
  };

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

  // Categorize challenges
  const sentPending = challenges.filter(c => c.sender_id === user?.id && c.status === 'pending');
  const sentAccepted = challenges.filter(c => c.sender_id === user?.id && c.status === 'accepted');
  const receivedPending = challenges.filter(c => c.recipient_id === user?.id && c.status === 'pending');
  const receivedAccepted = challenges.filter(c => c.recipient_id === user?.id && c.status === 'accepted');
  const activeChallenges = [...sentPending, ...sentAccepted, ...receivedPending, ...receivedAccepted];

  const getChallengeOpponentName = (challenge: Challenge) => {
    const opponentId = challenge.sender_id === user?.id ? challenge.recipient_id : challenge.sender_id;
    if (!opponentId) return null;
    const p = challengeProfiles[opponentId];
    return p ? (p.display_name || p.username) : null;
  };

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

      {/* Challenge Hero Card */}
      <div
        onClick={() => setChallengeModalOpen(true)}
        className="border border-white/[0.08] rounded-sm p-6 hover:border-white/[0.15] transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-serif text-base text-white/80 mb-1">Challenge a Friend</div>
            <div className="text-[11px] text-white/25 leading-relaxed">Share a link and prove who&apos;s faster</div>
          </div>
          <button
            className="px-4 py-1.5 bg-white/90 text-[#050505] text-[10px] tracking-[1.5px] font-semibold rounded-sm hover:bg-white transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setChallengeModalOpen(true);
            }}
          >
            CREATE LINK
          </button>
        </div>
      </div>

      {/* Pending Challenges Section */}
      {activeChallenges.length > 0 && (
        <div>
          <div className="text-[9px] tracking-[3px] text-white/20 mb-4">CHALLENGES</div>
          <div className="space-y-2">
            {/* Sent, pending — waiting for someone to accept */}
            {sentPending.map((challenge) => (
              <div
                key={challenge.id}
                className="border border-white/[0.06] rounded-sm p-5 bg-white/[0.01]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] text-white/50">Waiting for someone to accept</div>
                    <div className="font-mono text-[11px] text-white/15 mt-1 truncate max-w-[220px]">
                      /challenge/{challenge.code}
                    </div>
                  </div>
                  <div className="text-[9px] tracking-[1.5px] text-white/15">PENDING</div>
                </div>
              </div>
            ))}

            {/* Sent, accepted — opponent accepted, you can play */}
            {sentAccepted.map((challenge) => {
              const opponentName = getChallengeOpponentName(challenge);
              return (
                <div
                  key={challenge.id}
                  className="border border-white/[0.08] rounded-sm p-5 bg-white/[0.03]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[13px] text-white/60">
                        {opponentName ? `${opponentName} accepted` : 'Challenge accepted'}
                      </div>
                      <div className="text-[11px] text-white/20 mt-0.5">Ready to play</div>
                    </div>
                    <Link
                      href="/play"
                      className="px-4 py-1.5 bg-white/90 text-[#050505] text-[10px] tracking-[1.5px] font-semibold rounded-sm hover:bg-white transition-colors"
                    >
                      PLAY NOW
                    </Link>
                  </div>
                </div>
              );
            })}

            {/* Received, pending — you need to accept or decline */}
            {receivedPending.map((challenge) => {
              const opponentName = getChallengeOpponentName(challenge);
              return (
                <div
                  key={challenge.id}
                  className="border border-white/[0.08] rounded-sm p-5 bg-white/[0.02]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[13px] text-white/60">
                        {opponentName ? `${opponentName} challenged you` : 'You received a challenge'}
                      </div>
                      <div className="text-[11px] text-white/20 mt-0.5">Accept to start the match</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAccept(challenge.code)}
                        className="px-4 py-1.5 bg-white/90 text-[#050505] text-[10px] tracking-[1.5px] font-semibold rounded-sm hover:bg-white transition-colors"
                      >
                        ACCEPT
                      </button>
                      <button
                        onClick={() => handleDecline(challenge.code)}
                        className="px-2.5 py-1.5 border border-white/[0.08] text-white/30 text-[10px] rounded-sm hover:border-white/[0.15] hover:text-white/50 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Received, accepted — waiting to play */}
            {receivedAccepted.map((challenge) => {
              const opponentName = getChallengeOpponentName(challenge);
              return (
                <div
                  key={challenge.id}
                  className="border border-white/[0.06] rounded-sm p-5 bg-white/[0.01]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[13px] text-white/50">
                        {opponentName ? `Match vs ${opponentName}` : 'Challenge accepted'}
                      </div>
                      <div className="text-[11px] text-white/20 mt-0.5">Ready to play</div>
                    </div>
                    <Link
                      href="/play"
                      className="px-4 py-1.5 bg-white/90 text-[#050505] text-[10px] tracking-[1.5px] font-semibold rounded-sm hover:bg-white transition-colors"
                    >
                      PLAY NOW
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Challenge Modal */}
      <ChallengeModal
        isOpen={challengeModalOpen}
        onClose={() => {
          setChallengeModalOpen(false);
          fetchChallenges();
        }}
      />
    </div>
  );
}
