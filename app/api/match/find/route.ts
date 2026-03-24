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

    // Get player's profile for Elo
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('elo_rating')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const playerElo = profile.elo_rating;
    const body = await request.json().catch(() => ({}));
    const eloRange = body.eloRange ?? GAME_CONFIG.MATCHMAKING_ELO_RANGE_INITIAL;

    // Check if player is already in an active match
    const { data: existingActive } = await supabase
      .from('matches')
      .select('id, status')
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (existingActive) {
      return NextResponse.json({
        matchId: existingActive.id,
        status: existingActive.status,
      });
    }

    // Check for own waiting matches — abandon stale ones (>30s old)
    const { data: existingWaiting } = await supabase
      .from('matches')
      .select('id, status, created_at')
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .eq('status', 'waiting')
      .limit(1)
      .single();

    if (existingWaiting) {
      const ageMs = Date.now() - new Date(existingWaiting.created_at).getTime();
      if (ageMs > 30000) {
        // Stale waiting match — abandon it silently so we can create a fresh one
        await supabase
          .from('matches')
          .update({ status: 'abandoned' })
          .eq('id', existingWaiting.id)
          .eq('status', 'waiting');
      } else {
        // Recent waiting match — return it (client is probably still on this page)
        return NextResponse.json({
          matchId: existingWaiting.id,
          status: existingWaiting.status,
        });
      }
    }

    // Check for accepted challenges — prioritize challenge matches
    const { data: acceptedChallenges } = await supabase
      .from('challenges')
      .select('id, sender_id, recipient_id')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .limit(1);

    if (acceptedChallenges && acceptedChallenges.length > 0) {
      const challenge = acceptedChallenges[0];
      const opponentId = challenge.sender_id === user.id ? challenge.recipient_id : challenge.sender_id;

      if (opponentId) {
        // Check if opponent is also searching (has a waiting match)
        const { data: opponentMatch } = await supabase
          .from('matches')
          .select('id, avg_difficulty')
          .eq('player1_id', opponentId)
          .eq('status', 'waiting')
          .limit(1)
          .single();

        if (opponentMatch) {
          // Both players are searching — create the challenge match
          const avgElo = Math.round((opponentMatch.avg_difficulty + playerElo) / 2);
          const problems = generateProblems(avgElo, GAME_CONFIG.TARGET_SCORE + GAME_CONFIG.PROBLEMS_BUFFER);

          const { error: joinError } = await supabase
            .from('matches')
            .update({
              player2_id: user.id,
              status: 'active',
              problems: JSON.parse(JSON.stringify(problems)),
              avg_difficulty: avgElo,
              player1_elo_before: opponentMatch.avg_difficulty,
              player2_elo_before: playerElo,
              started_at: new Date().toISOString(),
            })
            .eq('id', opponentMatch.id)
            .eq('status', 'waiting');

          if (!joinError) {
            // Link the challenge to the match
            await supabase
              .from('challenges')
              .update({ match_id: opponentMatch.id })
              .eq('id', challenge.id);

            return NextResponse.json({ matchId: opponentMatch.id, status: 'active' });
          }
        }
      }
    }

    // Try to find a waiting match within Elo range (only recent ones — max 2 minutes old)
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

      // Join the match
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
        .eq('status', 'waiting'); // Optimistic lock

      if (joinError) {
        // Race condition: another player joined first. Create new match.
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
      }

      return NextResponse.json({ matchId: match.id, status: 'active' });
    }

    // No match found — create new waiting match
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
