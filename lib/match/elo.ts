import { GAME_CONFIG } from '@/lib/constants';
import type { EloResult } from '@/types';

function getKFactor(rating: number, gamesPlayed: number): number {
  if (gamesPlayed < GAME_CONFIG.K_FACTOR_GAMES_THRESHOLD) {
    return GAME_CONFIG.K_FACTOR_NEW;
  }
  if (rating < GAME_CONFIG.K_FACTOR_RATING_THRESHOLD) {
    return GAME_CONFIG.K_FACTOR_NORMAL;
  }
  return GAME_CONFIG.K_FACTOR_HIGH;
}

export function calculateElo(
  ratingA: number,
  ratingB: number,
  scoreA: 0 | 1,
  gamesPlayedA: number,
  gamesPlayedB: number
): EloResult {
  const kA = getKFactor(ratingA, gamesPlayedA);
  const kB = getKFactor(ratingB, gamesPlayedB);

  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;

  const scoreB = (1 - scoreA) as 0 | 1;

  const newRatingA = Math.max(
    GAME_CONFIG.ELO_FLOOR,
    Math.round(ratingA + kA * (scoreA - expectedA))
  );
  const newRatingB = Math.max(
    GAME_CONFIG.ELO_FLOOR,
    Math.round(ratingB + kB * (scoreB - expectedB))
  );

  return { newRatingA, newRatingB };
}
