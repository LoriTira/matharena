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

    // If challenge already has a match, check its status
    if (challenge.match_id) {
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('id, status, player1_id, player2_id')
        .eq('id', challenge.match_id)
        .single();

      if (existingMatch) {
        // If match is waiting, the second player activates it
        if (existingMatch.status === 'waiting') {
          const isAlreadyInMatch =
            existingMatch.player1_id === user.id || existingMatch.player2_id === user.id;

          if (isAlreadyInMatch) {
            // Same player calling again — just return waiting status
            return NextResponse.json({ matchId: existingMatch.id, status: 'waiting' });
          }
        }

        // If match is active or completed, just return it
        return NextResponse.json({ matchId: existingMatch.id, status: existingMatch.status });
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

    // Fetch both players' Elo
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('elo_rating')
      .eq('id', challenge.sender_id)
      .single();

    const { data: recipientProfile } = await supabase
      .from('profiles')
      .select('elo_rating')
      .eq('id', challenge.recipient_id)
      .single();

    if (!senderProfile || !recipientProfile) {
      return NextResponse.json({ error: 'Player profiles not found' }, { status: 404 });
    }

    const avgElo = Math.round((senderProfile.elo_rating + recipientProfile.elo_rating) / 2);
    const problems = generateProblems(avgElo, GAME_CONFIG.TARGET_SCORE + GAME_CONFIG.PROBLEMS_BUFFER);

    // Stage 1: First player creates a 'waiting' match
    // Stage 2: Second player will activate it (handled above when match_id exists)
    const { data: newMatch, error: createError } = await supabase
      .from('matches')
      .insert({
        player1_id: challenge.sender_id,
        player2_id: challenge.recipient_id,
        status: 'waiting',
        problems: JSON.parse(JSON.stringify(problems)),
        avg_difficulty: avgElo,
        player1_elo_before: senderProfile.elo_rating,
        player2_elo_before: recipientProfile.elo_rating,
        target_score: GAME_CONFIG.TARGET_SCORE,
      })
      .select('id, status')
      .single();

    if (createError || !newMatch) {
      return NextResponse.json({ error: 'Failed to create match' }, { status: 500 });
    }

    // Link challenge to match (optimistic lock: only if match_id is still null)
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
