import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { SOCIAL_CONFIG } from '@/lib/constants';
import type { MatchHistoryItem, MatchHistoryResponse, ProfileSnippet } from '@/types';

/**
 * GET /api/matches/history?userId=<uuid>&page=0
 *
 * Paginated completed-match history for any user, oriented from that user's
 * perspective. RLS on `matches` already allows public SELECT on completed
 * rows, so this handler never needs the admin client.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') ?? user.id;
    const page = Math.max(0, parseInt(url.searchParams.get('page') ?? '0', 10) || 0);
    const pageSize = SOCIAL_CONFIG.MATCH_HISTORY_PAGE_SIZE;

    // Fetch one extra row so we can detect hasMore without a COUNT query.
    const from = page * pageSize;
    const to = from + pageSize; // inclusive upper bound → returns pageSize+1 rows

    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .select(
        'id, player1_id, player2_id, player1_score, player2_score, ' +
        'player1_elo_before, player1_elo_after, player2_elo_before, player2_elo_after, ' +
        'winner_id, target_score, completed_at'
      )
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false, nullsFirst: false })
      .range(from, to);

    if (matchError) {
      console.error('Match history query error:', matchError);
      return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
    }

    const rawMatches = matches ?? [];
    const hasMore = rawMatches.length > pageSize;
    const pageRows = rawMatches.slice(0, pageSize);

    // Collect opponent ids for a single batch profile fetch.
    const opponentIds = Array.from(new Set(
      pageRows
        .map(m => (m.player1_id === userId ? m.player2_id : m.player1_id))
        .filter((id): id is string => !!id)
    ));

    const profileById = new Map<string, ProfileSnippet>();
    if (opponentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, elo_rating')
        .in('id', opponentIds);

      if (profiles) {
        for (const p of profiles as ProfileSnippet[]) {
          profileById.set(p.id, p);
        }
      }
    }

    const items: MatchHistoryItem[] = pageRows.map(m => {
      const viewerIsPlayer1 = m.player1_id === userId;
      const opponentId = viewerIsPlayer1 ? m.player2_id : m.player1_id;
      const viewer_score = viewerIsPlayer1 ? m.player1_score : m.player2_score;
      const opponent_score = viewerIsPlayer1 ? m.player2_score : m.player1_score;
      const viewer_elo_before = viewerIsPlayer1 ? m.player1_elo_before : m.player2_elo_before;
      const viewer_elo_after = viewerIsPlayer1 ? m.player1_elo_after : m.player2_elo_after;

      const elo_delta =
        viewer_elo_before != null && viewer_elo_after != null
          ? viewer_elo_after - viewer_elo_before
          : 0;

      let result: 'win' | 'loss' | 'draw';
      if (!m.winner_id) result = 'draw';
      else if (m.winner_id === userId) result = 'win';
      else result = 'loss';

      return {
        match_id: m.id,
        completed_at: m.completed_at ?? '',
        target_score: m.target_score,
        opponent: opponentId ? (profileById.get(opponentId) ?? null) : null,
        viewer_score,
        opponent_score,
        result,
        viewer_elo_before,
        viewer_elo_after,
        elo_delta,
      };
    });

    const response: MatchHistoryResponse = {
      page,
      pageSize,
      hasMore,
      items,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Match history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
