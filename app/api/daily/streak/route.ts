import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getTodayPuzzleDate } from '@/lib/problems/dateUtils';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = getTodayPuzzleDate();

    // Get user's daily puzzle results ordered by date descending
    const { data: results, error: queryError } = await supabase
      .from('daily_puzzle_results')
      .select('puzzle_date')
      .eq('user_id', user.id)
      .order('puzzle_date', { ascending: false })
      .limit(365);

    if (queryError) {
      console.error('Streak query error:', queryError);
      return NextResponse.json({ error: 'Failed to fetch streak' }, { status: 500 });
    }

    const completedDates = new Set((results ?? []).map((r) => r.puzzle_date));
    const completedToday = completedDates.has(today);

    // Count consecutive days backwards from today (or yesterday if today not done)
    let streak = 0;
    const startDate = new Date(today + 'T00:00:00Z');

    // If today is completed, start counting from today; otherwise from yesterday
    if (!completedToday) {
      startDate.setUTCDate(startDate.getUTCDate() - 1);
    }

    while (true) {
      const dateStr = startDate.toISOString().split('T')[0];
      if (completedDates.has(dateStr)) {
        streak++;
        startDate.setUTCDate(startDate.getUTCDate() - 1);
      } else {
        break;
      }
    }

    return NextResponse.json({ streak, completedToday });
  } catch (error) {
    console.error('Daily streak error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
