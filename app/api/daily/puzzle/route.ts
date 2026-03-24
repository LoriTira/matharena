import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { generateDailyProblems } from '@/lib/problems/daily';
import { getTodayPuzzleDate } from '@/lib/problems/dateUtils';
import type { ClientProblem } from '@/types';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = getTodayPuzzleDate();
    const problems = generateDailyProblems(today);

    // Strip answers before sending to client
    const clientProblems: ClientProblem[] = problems.map(({ operand1, operand2, operation }) => ({
      operand1,
      operand2,
      operation,
    }));

    // Check if user already completed today's puzzle
    const { data: existing } = await supabase
      .from('daily_puzzle_results')
      .select('total_time_ms, problem_times')
      .eq('user_id', user.id)
      .eq('puzzle_date', today)
      .single();

    const completed = !!existing;

    return NextResponse.json({
      problems: clientProblems,
      completed,
      ...(existing ? { result: { total_time_ms: existing.total_time_ms, problem_times: existing.problem_times } } : {}),
    });
  } catch (error) {
    console.error('Daily puzzle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
