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

    // Verify caller is a participant
    if (challenge.sender_id !== user.id && challenge.recipient_id !== user.id) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Check expiry
    if (new Date(challenge.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Challenge has expired' }, { status: 400 });
    }

    // Idempotency: if challenge already has a match, return it
    if (challenge.match_id) {
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('id, status')
        .eq('id', challenge.match_id)
        .single();

      if (existingMatch) {
        return NextResponse.json({ matchId: existingMatch.id, status: existingMatch.status });
      }
    }

    // Check neither player is in an existing active/waiting match
    const { data: existingMatch } = await supabase
      .from('matches')
      .select('id, status')
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .in('status', ['waiting', 'active'])
      .limit(1)
      .single();

    if (existingMatch) {
      return NextResponse.json(
        { error: 'You are already in an active match', matchId: existingMatch.id },
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

    // Create the match
    const { data: newMatch, error: createError } = await supabase
      .from('matches')
      .insert({
        player1_id: challenge.sender_id,
        player2_id: challenge.recipient_id,
        status: 'active',
        problems: JSON.parse(JSON.stringify(problems)),
        avg_difficulty: avgElo,
        player1_elo_before: senderProfile.elo_rating,
        player2_elo_before: recipientProfile.elo_rating,
        started_at: new Date().toISOString(),
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
        return NextResponse.json({ matchId: refreshed.match_id, status: 'active' });
      }

      return NextResponse.json({ error: 'Failed to start challenge' }, { status: 500 });
    }

    return NextResponse.json({ matchId: newMatch.id, status: 'active' });
  } catch (error) {
    console.error('Challenge start error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
