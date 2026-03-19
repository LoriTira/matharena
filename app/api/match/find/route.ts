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

    // Check if player is already in an active/waiting match
    const { data: existingMatch } = await supabase
      .from('matches')
      .select('id, status')
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .in('status', ['waiting', 'active'])
      .limit(1)
      .single();

    if (existingMatch) {
      return NextResponse.json({
        matchId: existingMatch.id,
        status: existingMatch.status,
      });
    }

    // Try to find a waiting match within Elo range
    const { data: waitingMatches } = await supabase
      .from('matches')
      .select('id, player1_id, avg_difficulty')
      .eq('status', 'waiting')
      .neq('player1_id', user.id)
      .gte('avg_difficulty', playerElo - eloRange)
      .lte('avg_difficulty', playerElo + eloRange)
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
