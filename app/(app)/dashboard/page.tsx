'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { ChallengeModal } from '@/components/challenge/ChallengeModal';
import { Card } from '@/components/ui/Card';
import Sparkline from '@/components/ui/Sparkline';
import { Skeleton } from '@/components/ui/Skeleton';
import { RankBadge } from '@/components/ui/RankBadge';
import { getRank } from '@/lib/ranks';
import type { Profile, Match, Challenge } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [opponentNames, setOpponentNames] = useState<Record<string, string>>({});
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeProfiles, setChallengeProfiles] = useState<
    Record<string, { username: string; display_name: string | null; elo_rating: number; games_won: number; games_played: number }>
  >({});
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [sparklineData, setSparklineData] = useState<number[]>([]);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [dailyStreak, setDailyStreak] = useState<number>(0);
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

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

  const fetchData = useCallback(async () => {
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData) setProfile(profileData as Profile);

    // Recent matches (5 for display)
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

      const opponentIds = matches
        .map((m) => (m.player1_id === user.id ? m.player2_id : m.player1_id))
        .filter((id): id is string => id !== null);

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

    // Sparkline data: last 20 completed matches, extract user's elo_after
    const { data: sparklineMatches } = await supabase
      .from('matches')
      .select('player1_id, player2_id, player1_elo_after, player2_elo_after, completed_at')
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .eq('status', 'completed')
      .order('completed_at', { ascending: true })
      .limit(20);

    if (sparklineMatches && sparklineMatches.length > 0) {
      const eloHistory = sparklineMatches.map((m) => {
        const isP1 = m.player1_id === user.id;
        return (isP1 ? m.player1_elo_after : m.player2_elo_after) ?? 1000;
      });
      setSparklineData(eloHistory);
    }

    // Online player count
    try {
      const { count } = await supabase
        .from('matches')
        .select('id', { count: 'exact', head: true })
        .in('status', ['waiting', 'active']);
      setOnlineCount(count ?? 0);
    } catch {
      setOnlineCount(null);
    }

    // Daily streak (graceful — API may not exist yet)
    try {
      const res = await fetch('/api/daily/streak');
      if (res.ok) {
        const data = await res.json();
        setDailyStreak(data.streak ?? 0);
        setDailyCompleted(data.completedToday ?? false);
      }
    } catch {
      // API doesn't exist yet
    }

    setLoading(false);
  }, [user, supabase]);

  // Initial data fetch
  useEffect(() => {
    if (!user) return;
    fetchData();
    fetchChallenges();
  }, [user, fetchData, fetchChallenges]);

  // Realtime subscriptions for challenges and matches
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'challenges' },
        (payload) => {
          const row = (payload.new ?? payload.old) as Record<string, unknown> | undefined;
          if (row && (row.sender_id === user.id || row.recipient_id === user.id)) {
            fetchChallenges();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches' },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row.player1_id === user.id || row.player2_id === user.id) {
            fetchData();
          }
        }
      )
      .subscribe();

    // Polling fallback: refetch challenges every 3s so accepted challenges
    // appear live even if Supabase realtime silently drops the event.
    const pollInterval = setInterval(fetchChallenges, 3000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [user, supabase, fetchData, fetchChallenges]);

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

  // Loading state: skeleton grid
  if (loading || !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  // Derived data
  const rank = getRank(profile.elo_rating);
  const ptsToNext = rank.nextTierElo - profile.elo_rating;

  // Categorize challenges
  const sentPending = challenges.filter((c) => c.sender_id === user?.id && c.status === 'pending');
  const sentAccepted = challenges.filter((c) => c.sender_id === user?.id && c.status === 'accepted');
  const receivedPending = challenges.filter((c) => c.recipient_id === user?.id && c.status === 'pending');
  const receivedAccepted = challenges.filter((c) => c.recipient_id === user?.id && c.status === 'accepted');
  const activeChallenges = [...sentPending, ...sentAccepted, ...receivedPending, ...receivedAccepted];

  const getChallengeOpponentName = (challenge: Challenge) => {
    const opponentId = challenge.sender_id === user?.id ? challenge.recipient_id : challenge.sender_id;
    if (!opponentId) return null;
    const p = challengeProfiles[opponentId];
    return p ? p.display_name || p.username : null;
  };

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="font-serif text-[28px] font-normal text-ink">
          Welcome back, {profile.display_name || profile.username}
        </h1>
        <p className="text-[13px] text-ink-muted mt-1">Your mind is your weapon. Keep it sharp.</p>
      </div>

      {/* 2-column responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ──────── Challenges (top) ──────── */}

        {/* 1. Challenges Card */}
        <Card variant="default" className="p-6 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] tracking-[2px] text-ink-faint">CHALLENGES</div>
            <button
              onClick={() => setChallengeModalOpen(true)}
              className="px-3 py-1 border border-edge text-ink-tertiary text-[12px] tracking-[1.5px] font-semibold rounded-sm hover:border-edge-strong hover:text-ink-secondary transition-colors"
            >
              CHALLENGE A FRIEND
            </button>
          </div>

          {activeChallenges.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {/* Received, pending */}
              {receivedPending.map((challenge) => {
                const opponentName = getChallengeOpponentName(challenge);
                return (
                  <div
                    key={challenge.id}
                    className="flex items-center justify-between p-3 rounded-sm bg-card border border-edge-faint"
                  >
                    <div>
                      <div className="text-[12px] text-ink-secondary">
                        {opponentName ? `${opponentName} challenged you` : 'You received a challenge'}
                      </div>
                      <div className="text-[12px] text-ink-faint mt-0.5">Accept to start</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAccept(challenge.code)}
                        className="px-3 py-1 bg-btn text-btn-text text-[11px] tracking-[1px] font-semibold rounded-sm hover:bg-btn-hover transition-colors"
                      >
                        ACCEPT
                      </button>
                      <button
                        onClick={() => handleDecline(challenge.code)}
                        className="px-2 py-1 border border-edge text-ink-muted text-[11px] rounded-sm hover:border-edge-strong hover:text-ink-tertiary transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Sent, accepted — ready to play */}
              {sentAccepted.map((challenge) => {
                const opponentName = getChallengeOpponentName(challenge);
                return (
                  <div
                    key={challenge.id}
                    className="flex items-center justify-between p-3 rounded-sm bg-card border border-accent/30"
                  >
                    <div>
                      <div className="text-[12px] text-ink-secondary">
                        {opponentName ? `${opponentName} accepted` : 'Challenge accepted'}
                      </div>
                      <div className="text-[12px] text-accent/70 mt-0.5">Ready to play</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/challenge/${challenge.code}/lobby`}
                        className="px-4 py-1.5 bg-accent text-on-accent text-[11px] tracking-[1px] font-semibold rounded-sm hover:bg-accent/90 transition-colors"
                      >
                        PLAY
                      </Link>
                      <button
                        onClick={() => handleDecline(challenge.code)}
                        className="px-2 py-1 border border-edge text-ink-muted text-[11px] rounded-sm hover:border-edge-strong hover:text-ink-tertiary transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Received, accepted — ready to play */}
              {receivedAccepted.map((challenge) => {
                const opponentName = getChallengeOpponentName(challenge);
                return (
                  <div
                    key={challenge.id}
                    className="flex items-center justify-between p-3 rounded-sm bg-card border border-accent/30"
                  >
                    <div>
                      <div className="text-[12px] text-ink-secondary">
                        {opponentName ? `Match vs ${opponentName}` : 'Challenge accepted'}
                      </div>
                      <div className="text-[12px] text-accent/70 mt-0.5">Ready to play</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/challenge/${challenge.code}/lobby`}
                        className="px-4 py-1.5 bg-accent text-on-accent text-[11px] tracking-[1px] font-semibold rounded-sm hover:bg-accent/90 transition-colors"
                      >
                        PLAY
                      </Link>
                      <button
                        onClick={() => handleDecline(challenge.code)}
                        className="px-2 py-1 border border-edge text-ink-muted text-[11px] rounded-sm hover:border-edge-strong hover:text-ink-tertiary transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Sent, pending — waiting */}
              {sentPending.map((challenge) => (
                <div
                  key={challenge.id}
                  className="flex items-center justify-between p-3 rounded-sm bg-card border border-edge-faint"
                >
                  <div>
                    <div className="text-[12px] text-ink-tertiary">Waiting for opponent</div>
                    <div className="font-mono text-[12px] text-ink-faint mt-0.5 truncate max-w-[180px]">
                      /challenge/{challenge.code}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDecline(challenge.code)}
                    className="px-2 py-1 border border-edge text-ink-faint text-[12px] rounded-sm hover:border-edge-strong hover:text-ink-tertiary transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[12px] text-ink-faint py-2">
              No active challenges
            </div>
          )}
        </Card>

        {/* ──────── Row 1 ──────── */}

        {/* 2. Quick Match Card */}
        <Card variant="interactive" className="p-6">
          <Link href="/play" className="block">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-serif text-lg text-ink mb-1">Ranked Match</div>
                <div className="text-[11px] text-ink-muted leading-relaxed">
                  First to 5 wins, Elo on the line
                </div>
              </div>
              {onlineCount !== null && (
                <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  ~{onlineCount} online
                </div>
              )}
            </div>
            <div className="inline-block px-6 py-2.5 bg-accent text-on-accent text-[11px] tracking-[2px] font-bold rounded-sm hover:bg-accent/90 transition-colors">
              PLAY NOW
            </div>
          </Link>
        </Card>

        {/* 2. Your Rating Card */}
        <Card variant="default" className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[11px] tracking-[2px] text-ink-faint mb-2">YOUR RATING</div>
              <div className="font-mono text-[36px] font-normal text-ink tabular-nums leading-none">
                {profile.elo_rating}
              </div>
            </div>
            <RankBadge elo={profile.elo_rating} size="lg" showLabel />
          </div>

          {/* Sparkline */}
          {sparklineData.length > 1 && (
            <div className="mt-3 mb-3">
              <Sparkline data={sparklineData} width={280} height={36} />
            </div>
          )}

          {/* Tier progress bar */}
          <div className="mt-3">
            <div className="h-1 w-full rounded-full bg-shade overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(rank.progress * 100, 100)}%`,
                  backgroundColor: rank.color,
                }}
              />
            </div>
            {rank.tier !== 'Grandmaster' && (
              <div className="text-[12px] text-ink-muted mt-1.5 font-mono tabular-nums">
                {ptsToNext} pts to {rank.tier === 'Bronze' ? 'Silver' : rank.tier === 'Silver' ? 'Gold' : rank.tier === 'Gold' ? 'Platinum' : rank.tier === 'Platinum' ? 'Diamond' : 'Grandmaster'}
              </div>
            )}
            {rank.tier === 'Grandmaster' && (
              <div className="text-[12px] mt-1.5 font-mono tabular-nums" style={{ color: rank.color }}>
                Grandmaster
              </div>
            )}
          </div>
        </Card>

        {/* ──────── Row 2 ──────── */}

        {/* 3. Daily Puzzle Card */}
        <Card variant="highlight" className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="font-serif text-lg text-ink mb-1">Daily Puzzle</div>
              <div className="text-[11px] text-ink-muted leading-relaxed">
                5 problems, race the clock
              </div>
            </div>
            <div className="text-[11px] text-ink-muted flex items-center gap-1">
              <span>🔥</span>
              <span className="font-mono tabular-nums">{dailyStreak} day streak</span>
            </div>
          </div>
          {dailyCompleted ? (
            <Link href="/daily" className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-accent-glow border border-accent/20">
              <span className="text-accent text-base">&#10003;</span>
              <span className="text-[12px] text-accent font-semibold tracking-[1px]">COMPLETED TODAY</span>
            </Link>
          ) : (
            <Link
              href="/daily"
              className="inline-block px-5 py-2 border border-accent/40 text-accent text-[12px] tracking-[1.5px] font-semibold rounded-sm hover:bg-accent-glow transition-colors"
            >
              SOLVE TODAY&apos;S PUZZLE
            </Link>
          )}
        </Card>

        {/* 4. Recent Matches Card */}
        <Card variant="default" className="p-6">
          <div className="text-[11px] tracking-[2px] text-ink-faint mb-4">RECENT MATCHES</div>
          {recentMatches.length > 0 ? (
            <div className="space-y-0 -mx-1">
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
                  <Link
                    key={match.id}
                    href={`/play/${match.id}/analysis`}
                    className="flex items-center justify-between px-1 py-2.5 border-b border-edge-faint last:border-b-0 hover:bg-card transition-colors -mx-1 px-2 rounded-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`font-mono text-[11px] tracking-[1px] px-1.5 py-0.5 rounded-sm ${
                          won
                            ? 'text-ink-secondary bg-shade'
                            : 'text-ink-muted bg-card'
                        }`}
                      >
                        {won ? 'W' : 'L'}
                      </span>
                      <span className="text-[12px] text-ink-secondary">vs {opponentName}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-[11px] text-ink-muted tabular-nums">
                        {myScore}&ndash;{theirScore}
                      </span>
                      <span
                        className={`font-mono text-[12px] tabular-nums w-10 text-right ${
                          eloChange >= 0 ? 'text-ink-secondary' : 'text-ink-faint'
                        }`}
                      >
                        {eloChange >= 0 ? '+' : ''}
                        {eloChange}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-[12px] text-ink-faint py-4">
              No matches played yet. Start a ranked match!
            </div>
          )}
        </Card>
      </div>

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
