import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { GAME_CONFIG } from '@/lib/constants';
import { generateProblems } from '@/lib/problems/generator';
import { z } from 'zod';

const startSchema = z.object({
  code: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = startSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { code } = parsed.data;

    // Fetch the challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('*')
      .eq('code', code)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    if (challenge.status !== 'accepted') {
      return NextResponse.json({ error: 'Challenge is not accepted' }, { status: 400 });
    }

    if (challenge.sender_id !== user.id && challenge.recipient_id !== user.id) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    if (new Date(challenge.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Challenge has expired' }, { status: 400 });
    }

    const opponentId = challenge.sender_id === user.id ? challenge.recipient_id : challenge.sender_id;

    // If challenge already has a match, handle based on state
    if (challenge.match_id) {
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('*')
        .eq('id', challenge.match_id)
        .single();

      if (existingMatch) {
        // Already active or completed — just redirect
        if (existingMatch.status === 'active' || existingMatch.status === 'completed') {
          return NextResponse.json({ matchId: existingMatch.id, status: existingMatch.status });
        }

        // Match is waiting — check if THIS user is the one who created it
        if (existingMatch.status === 'waiting') {
          if (existingMatch.player1_id === user.id) {
            // Same player polling again — still waiting for opponent
            return NextResponse.json({ matchId: existingMatch.id, status: 'waiting' });
          }

          // Second player arriving! Activate the match
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('elo_rating')
            .eq('id', user.id)
            .single();

          const { data: opponentProfile } = await supabase
            .from('profiles')
            .select('elo_rating')
            .eq('id', existingMatch.player1_id)
            .single();

          if (!myProfile || !opponentProfile) {
            return NextResponse.json({ error: 'Profiles not found' }, { status: 404 });
          }

          const avgElo = Math.round((myProfile.elo_rating + opponentProfile.elo_rating) / 2);
          const problems = generateProblems(avgElo, GAME_CONFIG.TARGET_SCORE + GAME_CONFIG.PROBLEMS_BUFFER);

          const { error: activateError } = await supabase
            .from('matches')
            .update({
              player2_id: user.id,
              status: 'active',
              problems: JSON.parse(JSON.stringify(problems)),
              avg_difficulty: avgElo,
              player1_elo_before: opponentProfile.elo_rating,
              player2_elo_before: myProfile.elo_rating,
              started_at: new Date().toISOString(),
            })
            .eq('id', existingMatch.id)
            .eq('status', 'waiting');

          if (activateError) {
            return NextResponse.json({ error: 'Failed to activate match' }, { status: 500 });
          }

          return NextResponse.json({ matchId: existingMatch.id, status: 'active' });
        }
      }
    }

    // Check the player isn't in another active/waiting match
    const { data: playerMatch } = await supabase
      .from('matches')
      .select('id, status')
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .in('status', ['waiting', 'active'])
      .limit(1)
      .single();

    if (playerMatch) {
      return NextResponse.json(
        { error: 'You are already in an active match', matchId: playerMatch.id },
        { status: 409 }
      );
    }

    // First player: create a waiting match with only player1 set
    const { data: newMatch, error: createError } = await supabase
      .from('matches')
      .insert({
        player1_id: user.id,
        status: 'waiting',
        avg_difficulty: 1200,
        target_score: GAME_CONFIG.TARGET_SCORE,
      })
      .select('id, status')
      .single();

    if (createError || !newMatch) {
      return NextResponse.json({ error: 'Failed to create match' }, { status: 500 });
    }

    // Link challenge to match (optimistic lock)
    const { data: updated } = await supabase
      .from('challenges')
      .update({ match_id: newMatch.id })
      .eq('id', challenge.id)
      .is('match_id', null)
      .select('match_id')
      .single();

    if (!updated) {
      // Another player created the match first — clean up ours and use theirs
      await supabase.from('matches').delete().eq('id', newMatch.id);

      const { data: refreshed } = await supabase
        .from('challenges')
        .select('match_id')
        .eq('id', challenge.id)
        .single();

      if (refreshed?.match_id) {
        return NextResponse.json({ matchId: refreshed.match_id, status: 'waiting' });
      }

      return NextResponse.json({ error: 'Failed to start challenge' }, { status: 500 });
    }

    return NextResponse.json({ matchId: newMatch.id, status: 'waiting' });
  } catch (error) {
    console.error('Challenge start error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
