'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { ChallengeModal } from '@/components/challenge/ChallengeModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { getTodayPuzzleDate } from '@/lib/problems/dateUtils';
import { PlayHub } from '@/components/dashboard/PlayHub';
import { ActiveChallengesCard } from '@/components/dashboard/ActiveChallengesCard';
import { RecentMatchesCard } from '@/components/dashboard/RecentMatchesCard';
import type { Profile, Match, Challenge } from '@/types';

export function DashboardContent() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [opponentNames, setOpponentNames] = useState<Record<string, string>>({});
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeProfiles, setChallengeProfiles] = useState<
    Record<string, { username: string; display_name: string | null }>
  >({});
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [dailyStreak, setDailyStreak] = useState<number>(0);
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [sprintPB, setSprintPB] = useState<number | null>(null);
  const [bestDailyRank, setBestDailyRank] = useState<number | null>(null);
  const [bestDailyTimeMs, setBestDailyTimeMs] = useState<number | null>(null);
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
          .select('id, username, display_name')
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

    const [profileRes, matchRes, onlineRes, sprintRes, dailyRes] = await Promise.all([
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

    if (profileRes.data) setProfile(profileRes.data as Profile);

    const matches = (matchRes.data ?? []) as Match[];
    setRecentMatches(matches);

    setOnlineCount(onlineRes.count ?? 0);

    if (sprintRes.data) setSprintPB(sprintRes.data.score);

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

    const followUps: Promise<void>[] = [];

    // Best historical daily rank
    if (dailyResults.length > 0) {
      const best = dailyResults.reduce(
        (min, r) => (!min || r.total_time_ms < min.total_time_ms ? r : min),
        dailyResults[0]
      );
      if (best) {
        setBestDailyTimeMs(best.total_time_ms);
        followUps.push(
          (async () => {
            const { count } = await supabase
              .from('daily_puzzle_results')
              .select('user_id', { count: 'exact', head: true })
              .eq('puzzle_date', best.puzzle_date)
              .lt('total_time_ms', best.total_time_ms);
            setBestDailyRank((count ?? 0) + 1);
          })()
        );
      }
    } else {
      setBestDailyTimeMs(null);
      setBestDailyRank(null);
    }

    // Opponent names
    const opponentIds = matches
      .map((m) => (m.player1_id === user.id ? m.player2_id : m.player1_id))
      .filter((id): id is string => id !== null);

    if (opponentIds.length > 0) {
      followUps.push(
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

    if (followUps.length > 0) await Promise.all(followUps);

    setMatchesLoaded(true);
  }, [user, supabase]);

  useEffect(() => {
    if (!user) return;
    fetchData();
    fetchChallenges();
  }, [user, fetchData, fetchChallenges]);

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

  if (!profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const sentPending = challenges.filter((c) => c.sender_id === user?.id && c.status === 'pending');
  const sentAccepted = challenges.filter((c) => c.sender_id === user?.id && c.status === 'accepted');
  const receivedPending = challenges.filter((c) => c.recipient_id === user?.id && c.status === 'pending');
  const receivedAccepted = challenges.filter((c) => c.recipient_id === user?.id && c.status === 'accepted');

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

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="font-serif text-4xl sm:text-5xl font-black text-ink leading-none tracking-tight">
          Welcome back, <em className="not-italic text-accent">{profile.display_name || profile.username}</em>
        </h1>
        <p className="text-[14px] font-medium text-ink-tertiary mt-3">
          Your mind is your weapon. Keep it sharp.
        </p>
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

      {/* PLAY HUB */}
      <PlayHub
        mode="authed"
        sprintPB={sprintPB}
        dailyStreak={dailyStreak}
        dailyCompleted={dailyCompleted}
        bestDailyRank={bestDailyRank}
        bestDailyTimeMs={bestDailyTimeMs}
        onlineCount={onlineCount}
        eloRating={profile.elo_rating}
        pendingInvitesCount={receivedPending.length}
        onChallengeFriend={() => setChallengeModalOpen(true)}
      />

      {/* Active Challenges (auto-hidden when empty) */}
      <ActiveChallengesCard
        receivedPending={receivedPending}
        sentAccepted={sentAccepted}
        receivedAccepted={receivedAccepted}
        sentPending={sentPending}
        challengeProfiles={challengeProfiles}
        currentUserId={user?.id}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />

      {/* Recent Matches */}
      <RecentMatchesCard
        matches={recentMatches}
        opponentNames={opponentNames}
        currentUserId={user?.id}
        loaded={matchesLoaded}
      />

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
