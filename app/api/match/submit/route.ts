import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { calculateElo } from '@/lib/match/elo';
import { z } from 'zod';

const submitSchema = z.object({
  matchId: z.string().uuid(),
  problemIndex: z.number().int().min(0),
  answer: z.number(),
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

    const { matchId, problemIndex, answer } = parsed.data;

    // Get the match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (match.status !== 'active') {
      return NextResponse.json({ error: 'Match is not active' }, { status: 400 });
    }

    // Verify player is in this match
    const isPlayer1 = match.player1_id === user.id;
    const isPlayer2 = match.player2_id === user.id;
    if (!isPlayer1 && !isPlayer2) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Check the answer
    const problems = match.problems as { operand1: number; operand2: number; operation: string; answer: number }[];
    if (problemIndex >= problems.length) {
      return NextResponse.json({ error: 'Invalid problem index' }, { status: 400 });
    }

    const problem = problems[problemIndex];
    const correct = answer === problem.answer;

    // Record the event
    const startTime = new Date(match.started_at).getTime();
    const elapsedMs = Date.now() - startTime;

    await supabase.from('match_events').insert({
      match_id: matchId,
      player_id: user.id,
      problem_index: problemIndex,
      event: correct ? 'answer_correct' : 'answer_wrong',
      submitted_answer: String(answer),
      elapsed_ms: elapsedMs,
    });

    // Update scores
    const scoreField = isPlayer1 ? 'player1_score' : 'player2_score';
    const penaltyField = isPlayer1 ? 'player1_penalties' : 'player2_penalties';

    const updates: Record<string, unknown> = {};

    if (correct) {
      const newScore = (isPlayer1 ? match.player1_score : match.player2_score) + 1;
      updates[scoreField] = newScore;

      // Check for win
      if (newScore >= match.target_score) {
        updates.status = 'completed';
        updates.winner_id = user.id;
        updates.completed_at = new Date().toISOString();

        // Calculate Elo
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
          const scoreA: 0 | 1 = isPlayer1 ? 1 : 0;
          const { newRatingA, newRatingB } = calculateElo(
            player1Profile.elo_rating,
            player2Profile.elo_rating,
            scoreA,
            player1Profile.games_played,
            player2Profile.games_played
          );

          updates.player1_elo_after = newRatingA;
          updates.player2_elo_after = newRatingB;

          // Update both profiles
          await supabase
            .from('profiles')
            .update({
              elo_rating: newRatingA,
              games_played: player1Profile.games_played + 1,
              games_won: isPlayer1 ? (player1Profile.games_played + 1) : player1Profile.games_played,
            })
            .eq('id', match.player1_id);

          await supabase
            .from('profiles')
            .update({
              elo_rating: newRatingB,
              games_played: player2Profile.games_played + 1,
              games_won: isPlayer2 ? (player2Profile.games_played + 1) : player2Profile.games_played,
            })
            .eq('id', match.player2_id);
        }
      }
    } else {
      updates[penaltyField] = (isPlayer1 ? match.player1_penalties : match.player2_penalties) + 1;
    }

    const { error: updateError } = await supabase
      .from('matches')
      .update(updates)
      .eq('id', matchId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update match' }, { status: 500 });
    }

    // If match completed, mark any associated challenge as completed
    if (updates.status === 'completed') {
      await supabase
        .from('challenges')
        .update({ status: 'completed' })
        .eq('match_id', matchId)
        .eq('status', 'accepted');
    }

    return NextResponse.json({
      correct,
      matchStatus: updates.status ?? 'active',
      scores: {
        player1: updates.player1_score ?? match.player1_score,
        player2: updates.player2_score ?? match.player2_score,
      },
    });
  } catch (error) {
    console.error('Match submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
