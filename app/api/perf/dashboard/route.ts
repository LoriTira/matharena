import { NextRequest, NextResponse } from 'next/server';
import { checkPerfAuth } from '@/lib/perf/gate';
import { createClient } from '@/lib/supabase/server';
import { timeAsync, type TimingResult } from '@/lib/perf/timing';

export async function GET(request: NextRequest) {
  const denied = checkPerfAuth(request);
  if (denied) return denied;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Must be authenticated to run dashboard perf test' },
      { status: 401 }
    );
  }

  // ── SEQUENTIAL (matches current dashboard code exactly) ──

  const seqStart = performance.now();
  const sequential: TimingResult[] = [];

  // 1. Profile
  const profile = await timeAsync('1_profile', async () =>
    supabase.from('profiles').select('*').eq('id', user.id).single()
  );
  sequential.push(profile);

  // 2. Recent 5 matches
  const matches = await timeAsync('2_recent_matches', async () =>
    supabase
      .from('matches')
      .select('*')
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(5)
  );
  sequential.push(matches);

  // 3. Opponent profiles (depends on #2)
  const matchRows = (matches.result as { data: { player1_id: string; player2_id: string | null }[] | null }).data ?? [];
  const opponentIds = matchRows
    .map((m) => (m.player1_id === user.id ? m.player2_id : m.player1_id))
    .filter((id): id is string => id !== null);

  const opponents = await timeAsync('3_opponent_profiles', async () =>
    opponentIds.length > 0
      ? supabase.from('profiles').select('id, username, display_name').in('id', opponentIds)
      : { data: [], error: null }
  );
  sequential.push(opponents);

  // 4. Sparkline (last 20 matches)
  const sparkline = await timeAsync('4_sparkline', async () =>
    supabase
      .from('matches')
      .select('player1_id, player2_id, player1_elo_after, player2_elo_after, completed_at')
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .eq('status', 'completed')
      .order('completed_at', { ascending: true })
      .limit(20)
  );
  sequential.push(sparkline);

  // 5. Online count
  const online = await timeAsync('5_online_count', async () =>
    supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .in('status', ['waiting', 'active'])
  );
  sequential.push(online);

  // 6. Daily streak (internal API call — triggers middleware!)
  const origin = request.nextUrl.origin;
  const cookieHeader = request.headers.get('cookie') ?? '';

  const dailyStreak = await timeAsync('6_daily_streak_api', () =>
    fetch(`${origin}/api/daily/streak`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    }).then((r) => r.json().catch(() => ({})))
  );
  sequential.push(dailyStreak);

  // 7. Daily leaderboard (internal API call — triggers middleware!)
  const dailyLb = await timeAsync('7_daily_leaderboard_api', () =>
    fetch(`${origin}/api/daily/leaderboard`, {
      headers: { cookie: cookieHeader },
    }).then((r) => r.json().catch(() => ({})))
  );
  sequential.push(dailyLb);

  // 8. Sprint PB
  const sprintPB = await timeAsync('8_sprint_pb', async () =>
    supabase
      .from('practice_sessions')
      .select('score')
      .eq('user_id', user.id)
      .eq('duration', 120)
      .order('score', { ascending: false })
      .limit(1)
      .single()
  );
  sequential.push(sprintPB);

  // 9. Challenge list (internal API call — triggers middleware!)
  const challengeList = await timeAsync('9_challenge_list_api', () =>
    fetch(`${origin}/api/challenge/list`, {
      headers: { cookie: cookieHeader },
    }).then((r) => r.json().catch(() => ({})))
  );
  sequential.push(challengeList);

  const seqTotal = Math.round((performance.now() - seqStart) * 100) / 100;

  // ── PARALLEL (independent queries run together) ──

  const parStart = performance.now();

  // Group 1: all independent queries in parallel
  const [parProfile, parSparkline, parOnline, parSprintPB, parDailyStreak, parChallenges] =
    await Promise.all([
      timeAsync('par_1_profile', async () =>
        supabase.from('profiles').select('*').eq('id', user.id).single()
      ),
      timeAsync('par_4_sparkline', async () =>
        supabase
          .from('matches')
          .select('player1_id, player2_id, player1_elo_after, player2_elo_after, completed_at')
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .eq('status', 'completed')
          .order('completed_at', { ascending: true })
          .limit(20)
      ),
      timeAsync('par_5_online_count', async () =>
        supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .in('status', ['waiting', 'active'])
      ),
      timeAsync('par_8_sprint_pb', async () =>
        supabase
          .from('practice_sessions')
          .select('score')
          .eq('user_id', user.id)
          .eq('duration', 120)
          .order('score', { ascending: false })
          .limit(1)
          .single()
      ),
      timeAsync('par_6_daily_streak_api', () =>
        fetch(`${origin}/api/daily/streak`, {
          headers: { cookie: cookieHeader },
          cache: 'no-store',
        }).then((r) => r.json().catch(() => ({})))
      ),
      timeAsync('par_9_challenges_api', () =>
        fetch(`${origin}/api/challenge/list`, {
          headers: { cookie: cookieHeader },
        }).then((r) => r.json().catch(() => ({})))
      ),
    ]);

  // Group 2: matches → opponents (sequential dependency)
  const parMatches = await timeAsync('par_2_recent_matches', async () =>
    supabase
      .from('matches')
      .select('*')
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(5)
  );
  const parMatchRows = (parMatches.result as { data: { player1_id: string; player2_id: string | null }[] | null }).data ?? [];
  const parOppIds = parMatchRows
    .map((m) => (m.player1_id === user.id ? m.player2_id : m.player1_id))
    .filter((id): id is string => id !== null);

  const parOpponents = await timeAsync('par_3_opponent_profiles', async () =>
    parOppIds.length > 0
      ? supabase.from('profiles').select('id, username, display_name').in('id', parOppIds)
      : { data: [], error: null }
  );

  // Daily leaderboard (depends on streak result)
  const parDailyLb = await timeAsync('par_7_daily_leaderboard_api', () =>
    fetch(`${origin}/api/daily/leaderboard`, {
      headers: { cookie: cookieHeader },
    }).then((r) => r.json().catch(() => ({})))
  );

  const parTotal = Math.round((performance.now() - parStart) * 100) / 100;

  // ── ANALYSIS ──

  const directQueryMs = sequential
    .filter((s) => !s.label.includes('_api'))
    .reduce((sum, s) => sum + s.ms, 0);
  const internalApiMs = sequential
    .filter((s) => s.label.includes('_api'))
    .reduce((sum, s) => sum + s.ms, 0);

  return NextResponse.json({
    sequential: {
      total_ms: seqTotal,
      queries: sequential.map((s) => ({ label: s.label, ms: s.ms })),
      direct_supabase_ms: Math.round(directQueryMs * 100) / 100,
      internal_api_ms: Math.round(internalApiMs * 100) / 100,
    },
    parallel: {
      total_ms: parTotal,
      queries: [
        parProfile, parSparkline, parOnline, parSprintPB,
        parDailyStreak, parChallenges, parMatches, parOpponents, parDailyLb,
      ].map((s) => ({ label: s.label, ms: s.ms })),
    },
    savings_ms: Math.round((seqTotal - parTotal) * 100) / 100,
    savings_pct: Math.round(((seqTotal - parTotal) / seqTotal) * 100),
    note: 'Internal API calls (streak, leaderboard, challenges) each re-trigger middleware auth, adding ~200-400ms overhead per call',
  });
}
