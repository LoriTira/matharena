import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { GAME_CONFIG } from '@/lib/constants';
import { generateProblems } from '@/lib/problems/generator';
import { z } from 'zod';

const startSchema = z.object({
  code: z.string().min(1),
});

// A player is considered "in the lobby" if their heartbeat is < 10s old
const STALE_THRESHOLD_MS = 10_000;

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

    const isSender = challenge.sender_id === user.id;

    // Step 1: Update caller's heartbeat timestamp
    const readyColumn = isSender ? 'sender_ready_at' : 'recipient_ready_at';
    await supabase
      .from('challenges')
      .update({ [readyColumn]: new Date().toISOString() })
      .eq('id', challenge.id);

    // Step 2: Re-fetch challenge with fresh timestamps
    const { data: fresh } = await supabase
      .from('challenges')
      .select('sender_ready_at, recipient_ready_at, match_id')
      .eq('id', challenge.id)
      .single();

    if (!fresh) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    // Step 3: Determine readiness from heartbeat timestamps
    const nowMs = Date.now();
    const senderOnline = !!fresh.sender_ready_at && (nowMs - new Date(fresh.sender_ready_at).getTime()) < STALE_THRESHOLD_MS;
    const recipientOnline = !!fresh.recipient_ready_at && (nowMs - new Date(fresh.recipient_ready_at).getTime()) < STALE_THRESHOLD_MS;
    const bothReady = senderOnline && recipientOnline;
    const opponentReady = isSender ? recipientOnline : senderOnline;

    // Step 4: If challenge already has a match, handle based on status
    if (fresh.match_id) {
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('id, status')
        .eq('id', fresh.match_id)
        .single();

      if (existingMatch) {
        if (existingMatch.status === 'active' || existingMatch.status === 'completed') {
          return NextResponse.json({ matchId: existingMatch.id, status: existingMatch.status });
        }

        // Stale waiting match (from old code path) — activate if both ready
        if (existingMatch.status === 'waiting' && bothReady) {
          const [{ data: sp }, { data: rp }] = await Promise.all([
            supabase.from('profiles').select('elo_rating').eq('id', challenge.sender_id).single(),
            supabase.from('profiles').select('elo_rating').eq('id', challenge.recipient_id).single(),
          ]);

          if (sp && rp) {
            const avgElo = Math.round((sp.elo_rating + rp.elo_rating) / 2);
            const problems = generateProblems(avgElo, GAME_CONFIG.TARGET_SCORE + GAME_CONFIG.PROBLEMS_BUFFER);

            const { error: activateError } = await supabase
              .from('matches')
              .update({
                player1_id: challenge.sender_id,
                player2_id: challenge.recipient_id,
                status: 'active',
                problems: JSON.parse(JSON.stringify(problems)),
                avg_difficulty: avgElo,
                player1_elo_before: sp.elo_rating,
                player2_elo_before: rp.elo_rating,
                target_score: GAME_CONFIG.TARGET_SCORE,
                started_at: new Date().toISOString(),
              })
              .eq('id', existingMatch.id)
              .eq('status', 'waiting');

            if (!activateError) {
              return NextResponse.json({ matchId: existingMatch.id, status: 'active' });
            }
          }
        }
      }

      // Match exists but not both ready, or activation failed
      return NextResponse.json({ status: 'waiting', myReady: true, opponentReady });
    }

    // Step 5: No match yet — if not both ready, just wait
    if (!bothReady) {
      return NextResponse.json({ status: 'waiting', myReady: true, opponentReady });
    }

    // Step 6: Both ready, no match — create one!

    // Ensure player isn't in another active match
    const { data: playerMatch } = await supabase
      .from('matches')
      .select('id, status')
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .in('status', ['active'])
      .limit(1)
      .single();

    if (playerMatch) {
      return NextResponse.json(
        { error: 'You are already in an active match', matchId: playerMatch.id },
        { status: 409 }
      );
    }

    // Fetch profiles for Elo and problem generation
    const [{ data: senderProfile }, { data: recipientProfile }] = await Promise.all([
      supabase.from('profiles').select('elo_rating').eq('id', challenge.sender_id).single(),
      supabase.from('profiles').select('elo_rating').eq('id', challenge.recipient_id).single(),
    ]);

    if (!senderProfile || !recipientProfile) {
      return NextResponse.json({ error: 'Profiles not found' }, { status: 404 });
    }

    const avgElo = Math.round((senderProfile.elo_rating + recipientProfile.elo_rating) / 2);
    const problems = generateProblems(avgElo, GAME_CONFIG.TARGET_SCORE + GAME_CONFIG.PROBLEMS_BUFFER);

    // Create active match directly (no waiting stage)
    const { data: newMatch, error: createError } = await supabase
      .from('matches')
      .insert({
        player1_id: challenge.sender_id,
        player2_id: challenge.recipient_id,
        status: 'active',
        problems: JSON.parse(JSON.stringify(problems)),
        avg_difficulty: avgElo,
        target_score: GAME_CONFIG.TARGET_SCORE,
        player1_elo_before: senderProfile.elo_rating,
        player2_elo_before: recipientProfile.elo_rating,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (createError || !newMatch) {
      return NextResponse.json({ error: 'Failed to create match' }, { status: 500 });
    }

    // Link match to challenge (optimistic lock — only first caller succeeds)
    const { data: updated } = await supabase
      .from('challenges')
      .update({ match_id: newMatch.id })
      .eq('id', challenge.id)
      .is('match_id', null)
      .select('match_id')
      .single();

    if (!updated) {
      // Other player won the race — clean up and use theirs
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
