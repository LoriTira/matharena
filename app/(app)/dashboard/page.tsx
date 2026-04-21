'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChallengeModal } from '@/components/challenge/ChallengeModal';
import { Panel } from '@/components/arcade/Panel';
import { SectionHead } from '@/components/arcade/SectionHead';
import { Btn } from '@/components/arcade/Btn';
import { Bar } from '@/components/arcade/Bar';
import { BigNum } from '@/components/arcade/BigNum';
import { RankPip } from '@/components/arcade/RankPip';
import { Sparkline } from '@/components/arcade/Sparkline';
import { Skeleton } from '@/components/ui/Skeleton';
import { getRank } from '@/lib/ranks';
import { NextPuzzleCountdown } from '@/components/daily/NextPuzzleCountdown';
import { formatLeaderboardTime } from '@/lib/daily/formatTime';
import { getTodayPuzzleDate } from '@/lib/problems/dateUtils';
import type { Tier } from '@/components/arcade/tokens';
import type { Profile, Match, Challenge } from '@/types';

type DailyLeaderboardEntry = { username: string; total_time_ms: number; rank: number };

// Map the 6-tier rank system to the 8-tier arcade pip palette. Grandmaster
// collapses into Grand (no separate Master tier in Elo yet).
function tierToArcade(tier: string): Tier {
  switch (tier) {
    case 'Bronze':      return 'Bronze';
    case 'Silver':      return 'Silver';
    case 'Gold':        return 'Gold';
    case 'Platinum':    return 'Platinum';
    case 'Diamond':     return 'Diamond';
    case 'Grandmaster': return 'Grand';
    default:            return 'Wood';
  }
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-14 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-[14px]">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px]">
        <Skeleton className="h-28" /><Skeleton className="h-28" />
        <Skeleton className="h-28" /><Skeleton className="h-28" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-[14px]">
        <Skeleton className="h-64" /><Skeleton className="h-64" />
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [opponentNames, setOpponentNames] = useState<Record<string, string>>({});
  const [opponentElos, setOpponentElos] = useState<Record<string, number>>({});
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

    if (profileRes.data) setProfile(profileRes.data as Profile);

    const matches = (matchRes.data ?? []) as Match[];
    setRecentMatches(matches);

    if (sparklineRes.data && sparklineRes.data.length > 0) {
      setSparklineData(
        sparklineRes.data.map((m) => {
          const isP1 = m.player1_id === user.id;
          return (isP1 ? m.player1_elo_after : m.player2_elo_after) ?? 1000;
        })
      );
    }

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

    const opponentIds = matches
      .map((m) => (m.player1_id === user.id ? m.player2_id : m.player1_id))
      .filter((id): id is string => id !== null);

    const group2: Promise<void>[] = [];

    if (opponentIds.length > 0) {
      group2.push(
        (async () => {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, display_name, elo_rating')
            .in('id', opponentIds);
          if (profiles) {
            const names: Record<string, string> = {};
            const elos: Record<string, number> = {};
            for (const p of profiles) {
              names[p.id] = p.display_name || p.username;
              elos[p.id] = p.elo_rating;
            }
            setOpponentNames(names);
            setOpponentElos(elos);
          }
        })()
      );
    }

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
    } catch {}
  };

  const handleAccept = async (challengeCode: string) => {
    try {
      const res = await fetch('/api/challenge/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: challengeCode }),
      });
      if (res.ok) fetchChallenges();
    } catch {}
  };

  const handleResendVerification = async () => {
    setResendingEmail(true);
    setResendSuccess(false);
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      if (res.ok) setResendSuccess(true);
    } catch {} finally {
      setResendingEmail(false);
    }
  };

  if (!profile) return <DashboardSkeleton />;

  const rank = getRank(profile.elo_rating);
  const ptsToNext = rank.nextTierElo - profile.elo_rating;
  const arcadeTier = tierToArcade(rank.tier);

  const sentPending = challenges.filter((c) => c.sender_id === user?.id && c.status === 'pending');
  const sentAccepted = challenges.filter((c) => c.sender_id === user?.id && c.status === 'accepted');
  const receivedPending = challenges.filter((c) => c.recipient_id === user?.id && c.status === 'pending');
  const receivedAccepted = challenges.filter((c) => c.recipient_id === user?.id && c.status === 'accepted');
  const activeChallenges = [...receivedPending, ...sentAccepted, ...receivedAccepted, ...sentPending];

  const getOpponentName = (c: Challenge) => {
    const oid = c.sender_id === user?.id ? c.recipient_id : c.sender_id;
    if (!oid) return null;
    const p = challengeProfiles[oid];
    return p ? (p.display_name || p.username) : null;
  };

  const displayName = profile.display_name || profile.username;

  return (
    <div className="space-y-[14px]">
      {/* Greeting row */}
      <div className="flex items-end justify-between gap-5 flex-wrap mb-2">
        <div>
          <div className="font-display font-extrabold text-[30px] md:text-[48px] tracking-[-1.5px] leading-[1.05] text-ink">
            Welcome back, <span className="text-cyan">{displayName}</span>.<br />
            <span className="text-ink-tertiary italic font-semibold">Sharpen the blade.</span>
          </div>
        </div>
        <div className="flex gap-[10px] flex-wrap">
          <Btn variant="primary" onClick={() => setChallengeModalOpen(true)}>
            ⚔ Challenge a friend
          </Btn>
          <Link href="/play"><Btn variant="ghost">Play online</Btn></Link>
          <Link href="/practice?sprint=120"><Btn variant="ghost">120s Sprint</Btn></Link>
        </div>
      </div>

      {/* Email verify banners */}
      {verifyStatus === 'success' && (
        <div className="flex items-center gap-2 px-4 py-3 border border-lime text-lime text-[13px] font-mono bg-panel">
          ✓ Email verified successfully!
        </div>
      )}
      {verifyStatus === 'expired' && (
        <div className="flex items-center gap-2 px-4 py-3 border border-gold text-gold text-[13px] font-mono bg-panel">
          Verification link expired. Please request a new one below.
        </div>
      )}
      {!profile.email_verified && verifyStatus !== 'success' && (
        <div className="flex items-center justify-between px-4 py-3 border border-gold bg-panel">
          <div className="flex items-center gap-2 text-[13px] font-mono text-gold">
            ! Please verify your email to secure your account.
          </div>
          <button
            onClick={handleResendVerification}
            disabled={resendingEmail || resendSuccess}
            className="shrink-0 px-3 py-1 font-mono text-[11px] tracking-[1px] font-bold border border-gold text-gold hover:bg-accent-glow transition-colors disabled:opacity-50"
          >
            {resendSuccess ? 'EMAIL SENT' : resendingEmail ? 'SENDING…' : 'RESEND EMAIL'}
          </button>
        </div>
      )}

      {/* Rating hero + Challenges */}
      <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-[14px]">
        {/* Rating */}
        <Panel padding={28}>
          <div className="flex justify-between items-start gap-3">
            <div>
              <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[2px]">
                Current rating
              </div>
              <div className="flex items-baseline gap-3 mt-[6px]">
                <BigNum n={profile.elo_rating} color="cyan" size={72} />
                {sparklineData.length > 1 && (
                  <span className="font-mono text-[14px] text-lime font-bold">
                    {(() => {
                      const delta = sparklineData[sparklineData.length - 1] - sparklineData[Math.max(0, sparklineData.length - 6)];
                      return `${delta >= 0 ? '+' : ''}${delta}`;
                    })()}
                  </span>
                )}
              </div>
              <div className="font-mono text-[11px] text-ink-tertiary mt-[4px] uppercase tracking-[1.2px]">
                <span style={{ color: rank.color }}>● {rank.name}</span>
                {rank.tier !== 'Grandmaster' && <> · {ptsToNext} to {nextTierName(rank.tier)}</>}
              </div>
            </div>
            <RankPip tier={arcadeTier} size={56} />
          </div>

          {sparklineData.length > 1 && (
            <div className="mt-5 h-[72px]">
              <Sparkline points={sparklineData} color="cyan" />
            </div>
          )}

          <div className="mt-3">
            <Bar progress={Math.min(rank.progress, 1)} color="cyan" height={8} />
            <div className="flex justify-between mt-[6px] font-mono text-[10px] text-ink-faint uppercase tracking-[1.2px]">
              <span>{rank.name} · {profile.elo_rating}</span>
              <span>→ {nextTierName(rank.tier)} · {rank.nextTierElo}</span>
            </div>
          </div>
        </Panel>

        {/* Challenges */}
        <Panel padding={28}>
          <div className="flex justify-between items-center mb-[16px]">
            <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[2px]">
              Challenges · {activeChallenges.length}
            </div>
            <Btn size="sm" variant="ghost" onClick={() => setChallengeModalOpen(true)}>+ Invite</Btn>
          </div>

          {activeChallenges.length > 0 ? (
            <div className="flex flex-col gap-[8px]">
              {activeChallenges.slice(0, 4).map((c) => {
                const opponentName = getOpponentName(c);
                const sent = c.sender_id === user?.id;
                const accepted = c.status === 'accepted';

                let statusText = '';
                let statusColor = 'text-ink-tertiary';
                let cta: React.ReactNode = null;

                if (accepted) {
                  statusText = opponentName ? (sent ? `${opponentName} accepted · Ready` : `vs ${opponentName} · Ready`) : 'Ready';
                  statusColor = 'text-lime';
                  cta = (
                    <Link href={`/challenge/${c.code}/lobby`}>
                      <Btn size="sm" variant="primary">Play</Btn>
                    </Link>
                  );
                } else if (!sent) {
                  statusText = opponentName ? `${opponentName} challenged you` : 'Challenged you';
                  statusColor = 'text-cyan';
                  cta = <Btn size="sm" variant="primary" onClick={() => handleAccept(c.code)}>Accept</Btn>;
                } else {
                  statusText = `Waiting · ${opponentName ?? 'open link'}`;
                }

                return (
                  <div
                    key={c.id}
                    className="flex justify-between items-center px-[12px] py-[10px] border border-edge bg-page"
                  >
                    <div className="min-w-0">
                      <div className="font-display font-bold text-[13px] text-ink truncate">
                        {opponentName ?? 'Open link'}
                      </div>
                      <div className={`font-mono text-[10px] uppercase tracking-[1px] mt-[2px] ${statusColor}`}>
                        {statusText}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {cta}
                      <button
                        onClick={() => handleDecline(c.code)}
                        className="px-2 py-1 border border-edge text-ink-faint text-[11px] hover:border-magenta hover:text-magenta transition-colors"
                        aria-label="Dismiss"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="font-mono text-[12px] text-ink-faint py-2 uppercase tracking-[1.2px]">
              No active challenges
            </div>
          )}
        </Panel>
      </div>

      {/* Mode tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px]">
        <ModeTile
          href="/play"
          title="Ranked duel"
          sub={onlineCount !== null ? `${onlineCount} online` : 'Find opponent'}
          color="magenta"
          icon="⚔"
          live={onlineCount !== null && onlineCount > 0}
        />
        <ModeTile
          href="/practice?sprint=120"
          title="120s Sprint"
          sub={sprintPB !== null ? `PB · ${sprintPB}` : 'Set your first PB'}
          color="cyan"
          icon="⚡"
        />
        <ModeTile
          href="/daily"
          title="Daily puzzle"
          sub={dailyStreak > 0 ? `🔥 ${dailyStreak} day streak` : 'Start streak'}
          color="gold"
          icon="☼"
        />
        <ModeTile
          href="/lessons"
          title="Lessons"
          sub="Tricks of the trade"
          color="lime"
          icon="☰"
        />
      </div>

      {/* Recent matches + Daily puzzle detail */}
      <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-[14px]">
        <Panel padding={24}>
          <SectionHead no="01" title="Recent matches" color="cyan" />
          {!matchesLoaded ? (
            <div className="space-y-3">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : recentMatches.length > 0 ? (
            <div>
              {recentMatches.map((match, i) => {
                const isPlayer1 = match.player1_id === user?.id;
                const won = match.winner_id === user?.id;
                const myScore = isPlayer1 ? match.player1_score : match.player2_score;
                const theirScore = isPlayer1 ? match.player2_score : match.player1_score;
                const eloChange = isPlayer1
                  ? (match.player1_elo_after ?? 0) - (match.player1_elo_before ?? 0)
                  : (match.player2_elo_after ?? 0) - (match.player2_elo_before ?? 0);
                const opponentId = isPlayer1 ? match.player2_id : match.player1_id;
                const opponentName = opponentId ? (opponentNames[opponentId] ?? 'Opponent') : 'Opponent';
                const opponentElo = opponentId ? opponentElos[opponentId] : undefined;

                return (
                  <Link
                    key={match.id}
                    href={`/play/${match.id}/analysis`}
                    className={`grid grid-cols-[36px_1.2fr_1fr_80px_80px] items-center py-[10px] font-mono text-[12px] ${
                      i < recentMatches.length - 1 ? 'border-b border-edge' : ''
                    } hover:bg-tint transition-colors`}
                  >
                    <span
                      className={`text-[10px] font-bold tracking-[1.4px] ${won ? 'text-lime' : 'text-magenta'}`}
                    >
                      {won ? 'WIN' : 'LOSS'}
                    </span>
                    <span className="text-ink truncate">{opponentName}</span>
                    <span className="text-ink-tertiary text-[11px]">
                      {opponentElo !== undefined ? `Elo ${opponentElo}` : ''}
                    </span>
                    <span className="text-right text-ink-tertiary">
                      {myScore}—{theirScore}
                    </span>
                    <span
                      className={`text-right font-bold ${eloChange >= 0 ? 'text-lime' : 'text-magenta'}`}
                    >
                      {eloChange >= 0 ? '+' : ''}{eloChange}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="font-mono text-[12px] text-ink-faint py-4 uppercase tracking-[1.2px]">
              No matches yet. Start a ranked match.
            </div>
          )}
        </Panel>

        <Panel padding={24}>
          <SectionHead no="02" title="Daily puzzle" color="gold" />
          {dailyCompleted ? (
            <DailyCompletedBlock
              userRank={dailyUserRank}
              userTimeMs={dailyUserTimeMs}
              topEntries={dailyTopEntries}
              currentUsername={profile.username ?? null}
              streak={dailyStreak}
            />
          ) : (
            <div className="space-y-4">
              <div className="font-mono text-[11px] text-ink-tertiary uppercase tracking-[1.4px]">
                {dailyStreak > 0 ? `🔥 ${dailyStreak} day streak — don’t break it` : 'Fresh puzzle waiting'}
              </div>
              <Link href="/daily" className="block"><Btn variant="gold" full>Solve today’s puzzle</Btn></Link>
              <NextPuzzleCountdown className="text-left font-mono text-[11px] text-ink-tertiary" />
            </div>
          )}
        </Panel>
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

function nextTierName(tier: string) {
  switch (tier) {
    case 'Bronze': return 'Silver';
    case 'Silver': return 'Gold';
    case 'Gold': return 'Platinum';
    case 'Platinum': return 'Diamond';
    case 'Diamond': return 'Grandmaster';
    default: return 'next tier';
  }
}

interface ModeTileProps {
  href: string;
  title: string;
  sub: string;
  color: 'magenta' | 'cyan' | 'gold' | 'lime';
  icon: string;
  live?: boolean;
}

function ModeTile({ href, title, sub, color, icon, live }: ModeTileProps) {
  const textColor = {
    magenta: 'text-magenta',
    cyan: 'text-cyan',
    gold: 'text-gold',
    lime: 'text-lime',
  }[color];

  return (
    <Link
      href={href}
      className="relative overflow-hidden block border border-edge-strong bg-panel p-[18px] hover:border-ink transition-colors"
    >
      <div
        className="absolute pointer-events-none"
        style={{
          top: 0, right: 0, width: 120, height: 120,
          background: `radial-gradient(circle at 80% 20%, var(--neon-${color})33, transparent 65%)`,
        }}
      />
      <div className={`text-[22px] ${textColor} mb-[14px]`}>{icon}</div>
      <div className="font-display font-bold text-[17px] tracking-[-0.3px] text-ink">{title}</div>
      <div className="font-mono text-[10px] text-ink-tertiary uppercase tracking-[1.2px] mt-[4px]">
        {sub}
      </div>
      {live && (
        <div className="absolute top-[14px] right-[14px] flex items-center gap-[5px]">
          <span className="inline-block w-[6px] h-[6px] rounded-full" style={{ background: 'var(--neon-lime)', boxShadow: '0 0 6px var(--neon-lime)' }} />
          <span className="font-mono text-[9px] text-lime uppercase tracking-[1.2px]">Live</span>
        </div>
      )}
    </Link>
  );
}

function DailyCompletedBlock({
  userRank,
  userTimeMs,
  topEntries,
  currentUsername,
  streak,
}: {
  userRank: number | null;
  userTimeMs: number | null;
  topEntries: DailyLeaderboardEntry[];
  currentUsername: string | null;
  streak: number;
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
      {userRank !== null && userTimeMs !== null && (
        <div>
          <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[1.4px] mb-[4px]">
            Your result · 🔥 {streak}
          </div>
          <div className="flex items-baseline gap-2">
            <BigNum n={`#${userRank}`} color="gold" size={32} />
            <span className="font-mono text-[14px] text-ink-tertiary tabular-nums">
              · {formatLeaderboardTime(userTimeMs)}
            </span>
          </div>
        </div>
      )}

      {top3.length > 0 && (
        <div>
          <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[1.4px] mb-[8px]">
            Top times
          </div>
          <div>
            {top3.map((entry) => {
              const isMe = entry.username === currentUsername;
              return (
                <div
                  key={`${entry.rank}-${entry.username}`}
                  className={`flex items-center justify-between px-2 py-1.5 ${isMe ? 'bg-accent-glow' : ''} border-b border-edge last:border-b-0`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-[11px] w-5 text-center tabular-nums ${isMe ? 'text-cyan' : 'text-ink-tertiary'}`}>
                      {entry.rank}
                    </span>
                    <span className={`text-[12px] ${isMe ? 'text-cyan font-semibold' : 'text-ink'}`}>
                      {isMe ? 'YOU' : entry.username}
                    </span>
                  </div>
                  <span className={`font-mono text-[11px] tabular-nums ${isMe ? 'text-cyan' : 'text-ink-tertiary'}`}>
                    {formatLeaderboardTime(entry.total_time_ms)}
                  </span>
                </div>
              );
            })}
            {!userInTop3 && userEntry && (
              <>
                <div className="text-center text-ink-faint text-[11px] py-1">···</div>
                <div className="flex items-center justify-between px-2 py-1.5 bg-accent-glow">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-cyan w-5 text-center tabular-nums">
                      {userEntry.rank}
                    </span>
                    <span className="text-[12px] text-cyan font-semibold">YOU</span>
                  </div>
                  <span className="font-mono text-[11px] text-cyan tabular-nums">
                    {formatLeaderboardTime(userEntry.total_time_ms)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex items-end justify-between gap-4 pt-1">
        <NextPuzzleCountdown className="text-left font-mono text-[11px] text-ink-tertiary" />
        <Link href="/daily" className="font-mono text-[10px] tracking-[1.5px] text-ink-tertiary hover:text-cyan transition-colors font-semibold">
          VIEW FULL →
        </Link>
      </div>
    </div>
  );
}
