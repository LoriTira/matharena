import type { AchievementDef } from '@/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ACHIEVEMENTS } from '@/lib/achievements';

interface MatchData {
  winner_id: string | null;
  player1_id: string;
  player2_id: string | null;
  player1_score: number;
  player2_score: number;
  player1_penalties: number;
  player2_penalties: number;
  player1_elo_before: number | null;
  player2_elo_before: number | null;
  started_at: string | null;
  completed_at: string | null;
}

export async function checkAchievements(
  userId: string,
  matchId: string,
  matchData: MatchData,
  supabase: SupabaseClient
): Promise<AchievementDef[]> {
  // Load existing achievements for this user
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);

  const earned = new Set((existing ?? []).map((a: { achievement_id: string }) => a.achievement_id));
  const unearnedDefs = ACHIEVEMENTS.filter(a => !earned.has(a.id));

  if (unearnedDefs.length === 0) return [];

  const isPlayer1 = matchData.player1_id === userId;
  const won = matchData.winner_id === userId;
  const myPenalties = isPlayer1 ? matchData.player1_penalties : matchData.player2_penalties;
  const opponentScore = isPlayer1 ? matchData.player2_score : matchData.player1_score;
  const myEloBefore = isPlayer1 ? matchData.player1_elo_before : matchData.player2_elo_before;
  const opponentEloBefore = isPlayer1 ? matchData.player2_elo_before : matchData.player1_elo_before;

  // Fetch profile for milestone checks
  const { data: profile } = await supabase
    .from('profiles')
    .select('games_won')
    .eq('id', userId)
    .single();

  const gamesWon = profile?.games_won ?? 0;

  // Compute match duration
  let matchDurationMs = Infinity;
  if (matchData.started_at && matchData.completed_at) {
    matchDurationMs = new Date(matchData.completed_at).getTime() - new Date(matchData.started_at).getTime();
  }

  const newlyUnlocked: AchievementDef[] = [];

  for (const def of unearnedDefs) {
    let unlocked = false;

    switch (def.id) {
      // Milestones
      case 'first_win':
        unlocked = gamesWon >= 1;
        break;
      case 'wins_10':
        unlocked = gamesWon >= 10;
        break;
      case 'wins_50':
        unlocked = gamesWon >= 50;
        break;
      case 'wins_100':
        unlocked = gamesWon >= 100;
        break;

      // Performance
      case 'flawless':
        unlocked = won && myPenalties === 0;
        break;
      case 'speed_demon':
        unlocked = won && matchDurationMs < 60000;
        break;
      case 'comeback':
        unlocked = won && opponentScore >= 4;
        break;
      case 'giant_killer':
        unlocked = won && myEloBefore != null && opponentEloBefore != null && (opponentEloBefore - myEloBefore) >= 200;
        break;

      // Streaks
      case 'streak_5':
      case 'streak_10': {
        const streakTarget = def.id === 'streak_5' ? 5 : 10;
        if (won) {
          const { data: recentMatches } = await supabase
            .from('matches')
            .select('winner_id')
            .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(streakTarget);

          if (recentMatches && recentMatches.length >= streakTarget) {
            unlocked = recentMatches.every((m: { winner_id: string | null }) => m.winner_id === userId);
          }
        }
        break;
      }

      // Social
      case 'first_challenge': {
        const { count } = await supabase
          .from('challenges')
          .select('id', { count: 'exact', head: true })
          .eq('sender_id', userId);
        unlocked = (count ?? 0) >= 1;
        break;
      }
      case 'rival': {
        // Check if user has played the same opponent 5+ times
        const { data: matchesAsP1 } = await supabase
          .from('matches')
          .select('player2_id')
          .eq('player1_id', userId)
          .eq('status', 'completed');

        const { data: matchesAsP2 } = await supabase
          .from('matches')
          .select('player1_id')
          .eq('player2_id', userId)
          .eq('status', 'completed');

        const opponentCounts: Record<string, number> = {};
        for (const m of matchesAsP1 ?? []) {
          if (m.player2_id) {
            opponentCounts[m.player2_id] = (opponentCounts[m.player2_id] ?? 0) + 1;
          }
        }
        for (const m of matchesAsP2 ?? []) {
          if (m.player1_id) {
            opponentCounts[m.player1_id] = (opponentCounts[m.player1_id] ?? 0) + 1;
          }
        }
        unlocked = Object.values(opponentCounts).some(count => count >= 5);
        break;
      }
    }

    if (unlocked) {
      newlyUnlocked.push(def);
    }
  }

  // Insert all newly unlocked achievements
  if (newlyUnlocked.length > 0) {
    await supabase.from('user_achievements').insert(
      newlyUnlocked.map(a => ({
        user_id: userId,
        achievement_id: a.id,
        match_id: matchId,
      }))
    );
  }

  return newlyUnlocked;
}
