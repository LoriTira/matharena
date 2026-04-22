'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChallengeModal } from '@/components/challenge/ChallengeModal';
import { Card } from '@/components/ui/Card';
import Sparkline from '@/components/ui/Sparkline';
import { Skeleton } from '@/components/ui/Skeleton';
import { RankBadge } from '@/components/ui/RankBadge';
import { getRank } from '@/lib/ranks';
import { NextPuzzleCountdown } from '@/components/daily/NextPuzzleCountdown';
import { formatLeaderboardTime } from '@/lib/daily/formatTime';
import { getTodayPuzzleDate } from '@/lib/problems/dateUtils';
import type { Profile, Match, Challenge } from '@/types';

type DailyLeaderboardEntry = { username: string; total_time_ms: number; rank: number };

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
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
  const [dailyUserRank, setDailyUserRank] = useState<number | null>(null);
  const [dailyUserTimeMs, setDailyUserTimeMs] = useState<number | null>(null);
  const [dailyTopEntries, setDailyTopEntries] = useState<DailyLeaderboardEntry[]>([]);
  const [sprintPB, setSprintPB] = useState<number | null>(null);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const searchParams = useSearchParams();
  const verifyStatus = searchParams.get('verify');
  const supabase = useMemo(() => createClient(), []);

  const fetchChallenges = useCallback(async () => {
    if (!user) return;
    try {
      const { data: challengeData } = await supabase
        .from('challenges')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .in('status', ['pending', 'accepted'])
        .is('match_id', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      const items = challengeData ?? [];
      setChallenges(items);

      const userIds = new Set<string>();
      for (const c of items) {
        userIds.add(c.sender_id);
        if (c.recipient_id) userIds.add(c.recipient_id);
      }
      userIds.delete(user.id);

      if (userIds.size > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, username, display_name, elo_rating, games_won, games_played')
          .in('id', Array.from(userIds));
        if (profileData) {
          setChallengeProfiles(Object.fromEntries(profileData.map((p) => [p.id, p])));
        }
      } else {
        setChallengeProfiles({});
      }
    } catch {
      // Silently fail
    }
  }, [user, supabase]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const today = getTodayPuzzleDate();

    // ── Group 1: all independent queries in parallel ──
    const [profileRes, matchRes, sparklineRes, onlineRes, sprintRes, dailyRes] =
      await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('matches')
          .select('*')
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(5),
        supabase
          .from('matches')
          .select('player1_id, player2_id, player1_elo_after, player2_elo_after, completed_at')
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .eq('status', 'completed')
          .order('completed_at', { ascending: true })
          .limit(20),
        supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .in('status', ['waiting', 'active']),
        supabase
          .from('practice_sessions')
          .select('score')
          .eq('user_id', user.id)
          .eq('duration', 120)
          .order('score', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('daily_puzzle_results')
          .select('puzzle_date, total_time_ms')
          .eq('user_id', user.id)
          .order('puzzle_date', { ascending: false })
          .limit(365),
      ]);

    // Process profile
    if (profileRes.data) setProfile(profileRes.data as Profile);

    // Process matches
    const matches = (matchRes.data ?? []) as Match[];
    setRecentMatches(matches);

    // Process sparkline
    if (sparklineRes.data && sparklineRes.data.length > 0) {
      setSparklineData(
        sparklineRes.data.map((m) => {
          const isP1 = m.player1_id === user.id;
          return (isP1 ? m.player1_elo_after : m.player2_elo_after) ?? 1000;
        })
      );
    }

    // Process online count
    setOnlineCount(onlineRes.count ?? 0);

    // Process sprint PB
    if (sprintRes.data) setSprintPB(sprintRes.data.score);

    // Process daily streak (computed locally)
    const dailyResults = dailyRes.data ?? [];
    const completedDates = new Set(dailyResults.map((r) => r.puzzle_date));
    const completedToday = completedDates.has(today);
    setDailyCompleted(completedToday);

    let streak = 0;
    const startDate = new Date(today + 'T00:00:00Z');
    if (!completedToday) startDate.setUTCDate(startDate.getUTCDate() - 1);
    while (completedDates.has(startDate.toISOString().split('T')[0])) {
      streak++;
      startDate.setUTCDate(startDate.getUTCDate() - 1);
    }
    setDailyStreak(streak);

    // ── Group 2: dependent queries in parallel ──
    const opponentIds = matches
      .map((m) => (m.player1_id === user.id ? m.player2_id : m.player1_id))
      .filter((id): id is string => id !== null);

    const group2: Promise<void>[] = [];

    // Opponent profiles (depends on matches)
    if (opponentIds.length > 0) {
      group2.push(
        (async () => {
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
        })()
      );
    }

    // Daily rank + leaderboard (only if completed today)
    if (completedToday) {
      const todayResult = dailyResults.find((r) => r.puzzle_date === today);
      if (todayResult) {
        setDailyUserTimeMs(todayResult.total_time_ms);

        group2.push(
          (async () => {
            const { count } = await supabase
              .from('daily_puzzle_results')
              .select('user_id', { count: 'exact', head: true })
              .eq('puzzle_date', today)
              .lt('total_time_ms', todayResult.total_time_ms);
            setDailyUserRank((count ?? 0) + 1);
          })()
        );

        group2.push(
          (async () => {
            const { data: results } = await supabase
              .from('daily_puzzle_results')
              .select('total_time_ms, user_id, profiles(username)')
              .eq('puzzle_date', today)
              .order('total_time_ms', { ascending: true })
              .limit(50);
            setDailyTopEntries(
              (results ?? []).map((row, index) => ({
                username: (row.profiles as unknown as { username: string })?.username ?? 'Unknown',
                total_time_ms: row.total_time_ms,
                rank: index + 1,
              }))
            );
          })()
        );
      }
    }

    if (group2.length > 0) await Promise.all(group2);

    setMatchesLoaded(true);
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

  // Wait only for profile before rendering the page structure
  if (!profile) {
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

  const handleResendVerification = async () => {
    setResendingEmail(true);
    setResendSuccess(false);
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      if (res.ok) setResendSuccess(true);
    } catch {
      // silent
    } finally {
      setResendingEmail(false);
    }
  };

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
        <h1 className="font-serif text-3xl font-normal text-ink">
          Welcome back, {profile.display_name || profile.username}
        </h1>
        <p className="text-[13px] text-ink-muted mt-1">Your mind is your weapon. Keep it sharp.</p>
      </div>

      {/* Email verification banner */}
      {verifyStatus === 'success' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-sm border border-green-500/30 bg-green-500/5 text-green-400 text-[13px]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Email verified successfully!
        </div>
      )}
      {verifyStatus === 'expired' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-sm border border-amber-500/30 bg-amber-500/5 text-amber-400 text-[13px]">
          Verification link expired. Please request a new one below.
        </div>
      )}
      {!profile.email_verified && verifyStatus !== 'success' && (
        <div className="flex items-center justify-between px-4 py-3 rounded-sm border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2 text-[13px] text-amber-300/90">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Please verify your email to secure your account.
          </div>
          <button
            onClick={handleResendVerification}
            disabled={resendingEmail || resendSuccess}
            className="shrink-0 px-3 py-1 text-[11px] tracking-[1px] font-semibold border border-amber-500/30 text-amber-300/90 rounded-sm hover:bg-amber-500/10 transition-colors disabled:opacity-50"
          >
            {resendSuccess ? 'EMAIL SENT' : resendingEmail ? 'SENDING...' : 'RESEND EMAIL'}
          </button>
        </div>
      )}

      {/* 2-column responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ──────── Row 0: Challenges + Rating ──────── */}

        {/* 1. Challenges Card */}
        <Card variant="default" className="p-6">
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
            <div className="space-y-2.5">
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
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{
                  width: `${Math.min(rank.progress * 100, 100)}%`,
                }}
              />
            </div>
            {rank.tier !== 'Grandmaster' && (
              <div className="text-[12px] text-ink-muted mt-1.5 font-mono tabular-nums">
                {ptsToNext} pts to {rank.tier === 'Bronze' ? 'Silver' : rank.tier === 'Silver' ? 'Gold' : rank.tier === 'Gold' ? 'Platinum' : rank.tier === 'Platinum' ? 'Diamond' : 'Grandmaster'}
              </div>
            )}
            {rank.tier === 'Grandmaster' && (
              <div className="text-[12px] text-accent mt-1.5 font-mono tabular-nums">
                Grandmaster
              </div>
            )}
          </div>
        </Card>

        {/* ──────── Row 1: Sprint + Ranked Match ──────── */}

        {/* 3. 120s Sprint Card */}
        <Card variant="interactive" className="p-6">
          <Link href="/practice?sprint=120" className="block">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-serif text-lg text-ink mb-1">120s Sprint</div>
                <div className="text-[11px] text-ink-muted leading-relaxed">
                  All operations, race the clock
                </div>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-accent/30 bg-accent-glow">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
            </div>
            {sprintPB !== null ? (
              <div className="mb-4">
                <div className="text-[11px] tracking-[1.5px] text-ink-faint mb-1">PERSONAL BEST</div>
                <div className="font-mono text-[28px] font-normal text-accent tabular-nums leading-none">
                  {sprintPB}
                </div>
              </div>
            ) : (
              <div className="text-[12px] text-ink-muted mb-4">
                Set your first record
              </div>
            )}
            <div className="inline-block px-6 py-2.5 border border-accent/40 text-accent text-[11px] tracking-[2px] font-bold rounded-sm hover:bg-accent-glow transition-colors">
              START SPRINT
            </div>
          </Link>
        </Card>

        {/* 4. Ranked Match Card */}
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
            <DailyCompletedBlock
              userRank={dailyUserRank}
              userTimeMs={dailyUserTimeMs}
              topEntries={dailyTopEntries}
              currentUsername={profile?.username ?? null}
            />
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
          {!matchesLoaded ? (
            <div className="space-y-3">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : recentMatches.length > 0 ? (
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

// --- Daily puzzle completed state ---

function DailyCompletedBlock({
  userRank,
  userTimeMs,
  topEntries,
  currentUsername,
}: {
  userRank: number | null;
  userTimeMs: number | null;
  topEntries: DailyLeaderboardEntry[];
  currentUsername: string | null;
}) {
  const top3 = topEntries.slice(0, 3);
  const userInTop3 =
    userRank !== null && userRank <= 3 && top3.some((e) => e.username === currentUsername);
  const userEntry =
    userRank !== null && userTimeMs !== null && currentUsername
      ? { rank: userRank, username: currentUsername, total_time_ms: userTimeMs }
      : null;

  return (
    <div className="space-y-4">
      {/* Your result */}
      {userRank !== null && userTimeMs !== null && (
        <div>
          <div className="text-[11px] tracking-[2px] text-ink-faint mb-1">YOUR RESULT</div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[24px] text-accent tabular-nums leading-none">
              #{userRank}
            </span>
            <span className="font-mono text-[14px] text-ink-muted tabular-nums">
              · {formatLeaderboardTime(userTimeMs)}
            </span>
          </div>
        </div>
      )}

      {/* Top times */}
      {top3.length > 0 && (
        <div>
          <div className="text-[11px] tracking-[2px] text-ink-faint mb-2">TOP TIMES</div>
          <div className="space-y-0">
            {top3.map((entry) => {
              const isMe = entry.username === currentUsername;
              return (
                <div
                  key={`${entry.rank}-${entry.username}`}
                  className={`flex items-center justify-between px-2 py-1.5 border-b border-edge-faint last:border-b-0 ${
                    isMe ? 'bg-accent-glow -mx-2 rounded-sm' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono text-[11px] w-5 text-center tabular-nums ${
                        isMe ? 'text-accent' : 'text-ink-muted'
                      }`}
                    >
                      {entry.rank}
                    </span>
                    <span
                      className={`text-[12px] ${isMe ? 'text-accent font-semibold' : 'text-ink-secondary'}`}
                    >
                      {isMe ? 'YOU' : entry.username}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      isMe ? 'text-accent' : 'text-ink-tertiary'
                    }`}
                  >
                    {formatLeaderboardTime(entry.total_time_ms)}
                  </span>
                </div>
              );
            })}
            {!userInTop3 && userEntry && (
              <>
                <div className="text-center text-ink-faint text-[11px] py-1">···</div>
                <div className="flex items-center justify-between px-2 py-1.5 bg-accent-glow -mx-2 rounded-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-accent w-5 text-center tabular-nums">
                      {userEntry.rank}
                    </span>
                    <span className="text-[12px] text-accent font-semibold">YOU</span>
                  </div>
                  <span className="font-mono text-[11px] text-accent tabular-nums">
                    {formatLeaderboardTime(userEntry.total_time_ms)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Countdown + view full results */}
      <div className="flex items-end justify-between gap-4 pt-1">
        <NextPuzzleCountdown className="text-left" />
        <Link
          href="/daily"
          className="text-[10px] tracking-[1.5px] text-ink-faint hover:text-accent transition-colors font-semibold"
        >
          VIEW FULL RESULTS →
        </Link>
      </div>
    </div>
  );
}
