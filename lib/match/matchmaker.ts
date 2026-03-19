import { createClient } from '@/lib/supabase/server';
import { generateProblems } from '@/lib/problems/generator';
import { GAME_CONFIG } from '@/lib/constants';

export async function findMatch(playerId: string, playerElo: number, eloRange?: number) {
  const supabase = await createClient();
  const range = eloRange ?? GAME_CONFIG.MATCHMAKING_ELO_RANGE_INITIAL;

  // Try to find a waiting match within Elo range
  const { data: waitingMatch, error: findError } = await supabase
    .rpc('find_and_join_match', {
      p_player_id: playerId,
      p_player_elo: playerElo,
      p_elo_range: range,
      p_target_score: GAME_CONFIG.TARGET_SCORE,
    });

  if (findError) {
    throw new Error(`Matchmaking error: ${findError.message}`);
  }

  // If RPC found and joined a match
  if (waitingMatch && waitingMatch.length > 0) {
    const match = waitingMatch[0];
    return { matchId: match.id, status: match.status as 'active' | 'waiting' };
  }

  // No match found — create a new waiting match
  const { data: newMatch, error: createError } = await supabase
    .from('matches')
    .insert({
      player1_id: playerId,
      status: 'waiting',
      avg_difficulty: playerElo,
    })
    .select('id, status')
    .single();

  if (createError) {
    throw new Error(`Failed to create match: ${createError.message}`);
  }

  return { matchId: newMatch.id, status: newMatch.status as 'waiting' };
}
