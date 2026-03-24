import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getTodayPuzzleDate } from '@/lib/problems/dateUtils';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') ?? getTodayPuzzleDate();

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
    }

    const { data: results, error: queryError } = await supabase
      .from('daily_puzzle_results')
      .select('total_time_ms, user_id, profiles(username)')
      .eq('puzzle_date', date)
      .order('total_time_ms', { ascending: true })
      .limit(50);

    if (queryError) {
      console.error('Leaderboard query error:', queryError);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    const leaderboard = (results ?? []).map((row, index) => ({
      username: (row.profiles as unknown as { username: string })?.username ?? 'Unknown',
      total_time_ms: row.total_time_ms,
      rank: index + 1,
    }));

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('Daily leaderboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
