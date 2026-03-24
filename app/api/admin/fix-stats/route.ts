import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

interface MatchRow {
  player1_id: string;
  player2_id: string | null;
  winner_id: string | null;
  status: string;
}

/**
 * One-time admin endpoint to recalculate games_played and games_won
 * for all players from completed match history.
 *
 * Call: POST /api/admin/fix-stats with header X-Admin-Key matching
 * the SUPABASE_SERVICE_ROLE_KEY env var (to prevent unauthorized use).
 */
export async function POST(request: Request) {
  const adminKey = request.headers.get('x-admin-key');
  if (!adminKey || adminKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any;

    // Fetch all completed/abandoned matches that have a winner
    const { data, error: matchError } = await admin
      .from('matches')
      .select('player1_id, player2_id, winner_id, status')
      .in('status', ['completed', 'abandoned'])
      .not('winner_id', 'is', null);

    if (matchError) {
      return NextResponse.json({ error: matchError.message }, { status: 500 });
    }

    const matches = (data ?? []) as MatchRow[];

    // Tally per player
    const stats: Record<string, { played: number; won: number }> = {};

    for (const m of matches) {
      for (const pid of [m.player1_id, m.player2_id]) {
        if (!pid) continue;
        if (!stats[pid]) stats[pid] = { played: 0, won: 0 };
        stats[pid].played += 1;
        if (pid === m.winner_id) stats[pid].won += 1;
      }
    }

    // Update each profile
    let updated = 0;
    for (const [playerId, { played, won }] of Object.entries(stats)) {
      const { error } = await admin
        .from('profiles')
        .update({ games_played: played, games_won: won })
        .eq('id', playerId);

      if (!error) updated++;
    }

    return NextResponse.json({
      success: true,
      matchesProcessed: matches.length,
      playersUpdated: updated,
      playerStats: stats,
    });
  } catch (error) {
    console.error('Fix stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
