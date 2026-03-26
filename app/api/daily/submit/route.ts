import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { generateDailyProblems } from '@/lib/problems/daily';
import { getTodayPuzzleDate } from '@/lib/problems/dateUtils';
import { z } from 'zod';

const submitSchema = z.object({
  answers: z.array(z.number()).length(5),
  problemTimes: z.array(z.number().int().min(0)).length(5),
  totalTimeMs: z.number().int().min(0),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    const { answers, problemTimes, totalTimeMs } = parsed.data;

    // Validate timing sanity to prevent cheating
    const MIN_PROBLEM_TIME_MS = 200;
    const MAX_TIME_DRIFT_MS = 500;

    for (let i = 0; i < problemTimes.length; i++) {
      if (problemTimes[i] < MIN_PROBLEM_TIME_MS) {
        return NextResponse.json({ error: 'Suspicious timing detected' }, { status: 400 });
      }
    }

    const sumOfTimes = problemTimes.reduce((a, b) => a + b, 0);
    if (Math.abs(sumOfTimes - totalTimeMs) > MAX_TIME_DRIFT_MS) {
      return NextResponse.json({ error: 'Timing inconsistency detected' }, { status: 400 });
    }

    const today = getTodayPuzzleDate();

    // Regenerate problems server-side for verification
    const problems = generateDailyProblems(today);

    // Verify all 5 answers
    for (let i = 0; i < 5; i++) {
      if (answers[i] !== problems[i].answer) {
        return NextResponse.json({ error: 'Incorrect answer', problemIndex: i }, { status: 400 });
      }
    }

    // Check if user already submitted today
    const { data: existing } = await supabase
      .from('daily_puzzle_results')
      .select('id')
      .eq('user_id', user.id)
      .eq('puzzle_date', today)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Already completed today\'s puzzle' }, { status: 409 });
    }

    // Insert result
    const { error: insertError } = await supabase
      .from('daily_puzzle_results')
      .insert({
        user_id: user.id,
        puzzle_date: today,
        total_time_ms: totalTimeMs,
        problem_times: problemTimes,
      });

    if (insertError) {
      console.error('Daily puzzle insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save result' }, { status: 500 });
    }

    // Query user's rank on today's leaderboard
    const { count: betterCount } = await supabase
      .from('daily_puzzle_results')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_date', today)
      .lt('total_time_ms', totalTimeMs);

    const { count: totalCount } = await supabase
      .from('daily_puzzle_results')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_date', today);

    const rank = (betterCount ?? 0) + 1;
    const totalPlayers = totalCount ?? 1;

    return NextResponse.json({ rank, totalPlayers, totalTimeMs });
  } catch (error) {
    console.error('Daily submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
