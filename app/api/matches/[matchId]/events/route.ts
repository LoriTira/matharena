import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/matches/[matchId]/events
 *
 * Returns the parent match row + the ordered append-only match_events log
 * for it. Used by MatchDetailModal to show a per-problem breakdown.
 *
 * RLS: completed matches and their events are publicly readable (see
 * migrations 001 and 004), so this route needs only the standard server
 * client.
 *
 * Next.js 19 note: dynamic route params are a Promise — await them before
 * reading fields. See the repo AGENTS.md warning about breaking changes.
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ matchId: string }> },
) {
  try {
    const { matchId } = await ctx.params;
    if (!matchId) {
      return NextResponse.json({ error: 'Missing matchId' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select(
        'id, player1_id, player2_id, player1_score, player2_score, ' +
        'player1_penalties, player2_penalties, winner_id, problems, ' +
        'target_score, completed_at, status'
      )
      .eq('id', matchId)
      .maybeSingle();

    if (matchError) {
      console.error('Match fetch error:', matchError);
      return NextResponse.json({ error: 'Failed to load match' }, { status: 500 });
    }
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const { data: events, error: eventsError } = await supabase
      .from('match_events')
      .select('id, player_id, problem_index, event, submitted_answer, elapsed_ms, created_at')
      .eq('match_id', matchId)
      .order('problem_index', { ascending: true })
      .order('created_at', { ascending: true });

    if (eventsError) {
      console.error('Match events fetch error:', eventsError);
      return NextResponse.json({ error: 'Failed to load events' }, { status: 500 });
    }

    return NextResponse.json({ match, events: events ?? [] });
  } catch (error) {
    console.error('Match events route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
