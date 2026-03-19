import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { calculateElo } from '@/lib/match/elo';
import { z } from 'zod';

const abandonSchema = z.object({
  matchId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = abandonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { matchId } = parsed.data;

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const isPlayer1 = match.player1_id === user.id;
    const isPlayer2 = match.player2_id === user.id;

    if (!isPlayer1 && !isPlayer2) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    if (match.status === 'completed' || match.status === 'abandoned') {
      return NextResponse.json({ error: 'Match already ended' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      status: 'abandoned',
      completed_at: new Date().toISOString(),
    };

    // If match was active (has two players), award win to opponent
    if (match.status === 'active' && match.player2_id) {
      const winnerId = isPlayer1 ? match.player2_id : match.player1_id;
      updates.winner_id = winnerId;

      // Calculate Elo changes
      const { data: player1Profile } = await supabase
        .from('profiles')
        .select('elo_rating, games_played')
        .eq('id', match.player1_id)
        .single();

      const { data: player2Profile } = await supabase
        .from('profiles')
        .select('elo_rating, games_played')
        .eq('id', match.player2_id)
        .single();

      if (player1Profile && player2Profile) {
        const scoreA: 0 | 1 = isPlayer1 ? 0 : 1;
        const { newRatingA, newRatingB } = calculateElo(
          player1Profile.elo_rating,
          player2Profile.elo_rating,
          scoreA,
          player1Profile.games_played,
          player2Profile.games_played
        );

        updates.player1_elo_after = newRatingA;
        updates.player2_elo_after = newRatingB;

        await supabase
          .from('profiles')
          .update({
            elo_rating: newRatingA,
            games_played: player1Profile.games_played + 1,
            games_won: !isPlayer1 ? player1Profile.games_played + 1 : player1Profile.games_played,
          })
          .eq('id', match.player1_id);

        await supabase
          .from('profiles')
          .update({
            elo_rating: newRatingB,
            games_played: player2Profile.games_played + 1,
            games_won: !isPlayer2 ? player2Profile.games_played + 1 : player2Profile.games_played,
          })
          .eq('id', match.player2_id);
      }
    }

    await supabase
      .from('matches')
      .update(updates)
      .eq('id', matchId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Match abandon error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
