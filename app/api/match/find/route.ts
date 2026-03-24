import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { GAME_CONFIG } from '@/lib/constants';
import { generateProblems } from '@/lib/problems/generator';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('elo_rating')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const playerElo = profile.elo_rating;
    const body = await request.json().catch(() => ({}));
    const eloRange = body.eloRange ?? GAME_CONFIG.MATCHMAKING_ELO_RANGE_INITIAL;

    // ── Step 1: Check if player is already in an active match ──
    const { data: existingActive } = await supabase
      .from('matches')
      .select('id, status, started_at')
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (existingActive) {
      // If the active match is stale (>10 min), abandon it so the player can search again
      const staleMs = GAME_CONFIG.MATCH_STALE_TIMEOUT_MINUTES * 60 * 1000;
      const age = Date.now() - new Date(existingActive.started_at).getTime();
      if (age > staleMs) {
        await supabase
          .from('matches')
          .update({ status: 'abandoned', completed_at: new Date().toISOString() })
          .eq('id', existingActive.id)
          .eq('status', 'active');
      } else {
        return NextResponse.json({
          matchId: existingActive.id,
          status: existingActive.status,
        });
      }
    }

    // ── Step 2: Look for an opponent's waiting match within Elo range ──
    const freshnessThreshold = new Date(Date.now() - 120_000).toISOString();
    const { data: waitingMatches } = await supabase
      .from('matches')
      .select('id, player1_id, avg_difficulty')
      .eq('status', 'waiting')
      .neq('player1_id', user.id)
      .gte('avg_difficulty', playerElo - eloRange)
      .lte('avg_difficulty', playerElo + eloRange)
      .gte('created_at', freshnessThreshold)
      .order('created_at', { ascending: true })
      .limit(1);

    if (waitingMatches && waitingMatches.length > 0) {
      const match = waitingMatches[0];
      const avgElo = Math.round((match.avg_difficulty + playerElo) / 2);
      const problems = generateProblems(avgElo, GAME_CONFIG.TARGET_SCORE + GAME_CONFIG.PROBLEMS_BUFFER);

      // Join the match (optimistic lock on status=waiting prevents double-join)
      const { error: joinError } = await supabase
        .from('matches')
        .update({
          player2_id: user.id,
          status: 'active',
          problems: JSON.parse(JSON.stringify(problems)),
          avg_difficulty: avgElo,
          player1_elo_before: match.avg_difficulty,
          player2_elo_before: playerElo,
          started_at: new Date().toISOString(),
        })
        .eq('id', match.id)
        .eq('status', 'waiting');

      if (!joinError) {
        // Clean up own stale waiting match (if any)
        await supabase
          .from('matches')
          .update({ status: 'abandoned' })
          .eq('player1_id', user.id)
          .eq('status', 'waiting');

        return NextResponse.json({ matchId: match.id, status: 'active' });
      }
      // Race condition: another player joined first. Fall through to create/return own match.
    }

    // ── Step 3: Check for own waiting match ──
    const { data: ownWaiting } = await supabase
      .from('matches')
      .select('id, status, created_at')
      .eq('player1_id', user.id)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (ownWaiting) {
      const ageMs = Date.now() - new Date(ownWaiting.created_at).getTime();
      if (ageMs > 120_000) {
        // Too old — abandon and create fresh below
        await supabase
          .from('matches')
          .update({ status: 'abandoned' })
          .eq('id', ownWaiting.id)
          .eq('status', 'waiting');
      } else {
        // Fresh — keep waiting, opponent will join this match
        return NextResponse.json({
          matchId: ownWaiting.id,
          status: ownWaiting.status,
        });
      }
    }

    // ── Step 4: Create new waiting match ──
    const { data: newMatch, error: createError } = await supabase
      .from('matches')
      .insert({
        player1_id: user.id,
        status: 'waiting',
        avg_difficulty: playerElo,
      })
      .select('id, status')
      .single();

    if (createError) {
      return NextResponse.json({ error: 'Failed to create match' }, { status: 500 });
    }

    return NextResponse.json({ matchId: newMatch.id, status: 'waiting' });
  } catch (error) {
    console.error('Match find error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
