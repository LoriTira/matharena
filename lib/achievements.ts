import type { AchievementDef } from '@/types';

export const ACHIEVEMENTS: AchievementDef[] = [
  // Milestones
  { id: 'first_win', name: 'First Blood', description: 'Win your first match', category: 'milestone', icon: '\u{1F5E1}\uFE0F', rarity: 'common' },
  { id: 'wins_10', name: 'Rising Star', description: 'Win 10 matches', category: 'milestone', icon: '\u2B50', rarity: 'common' },
  { id: 'wins_50', name: 'Veteran', description: 'Win 50 matches', category: 'milestone', icon: '\u{1F396}\uFE0F', rarity: 'rare' },
  { id: 'wins_100', name: 'Centurion', description: 'Win 100 matches', category: 'milestone', icon: '\u{1F451}', rarity: 'epic' },

  // Performance
  { id: 'flawless', name: 'Flawless Victory', description: 'Win without any wrong answers', category: 'performance', icon: '\u{1F48E}', rarity: 'rare' },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Win a match in under 60 seconds', category: 'performance', icon: '\u26A1', rarity: 'epic' },
  { id: 'comeback', name: 'Comeback Kid', description: 'Win after opponent reached 4 points', category: 'performance', icon: '\u{1F504}', rarity: 'epic' },
  { id: 'giant_killer', name: 'Giant Killer', description: 'Beat someone rated 200+ Elo above you', category: 'performance', icon: '\u{1F3D4}\uFE0F', rarity: 'legendary' },

  // Streaks
  { id: 'streak_5', name: 'Hot Streak', description: 'Win 5 matches in a row', category: 'streak', icon: '\u{1F525}', rarity: 'rare' },
  { id: 'streak_10', name: 'On Fire', description: 'Win 10 matches in a row', category: 'streak', icon: '\u{1F30B}', rarity: 'epic' },

  // Social
  { id: 'first_challenge', name: 'Challenger', description: 'Send your first challenge', category: 'social', icon: '\u2709\uFE0F', rarity: 'common' },
  { id: 'rival', name: 'Rival', description: 'Play the same person 5 times', category: 'social', icon: '\u2694\uFE0F', rarity: 'rare' },
];

export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}
