export interface RankInfo {
  tier: string;
  division: number;
  name: string;
  color: string;
  bgColor: string;
  nextTierElo: number;
  progress: number;
}

const TIERS = [
  { name: 'Bronze', min: 100, max: 799, color: '#CD7F32', bgColor: 'rgba(205, 127, 50, 0.12)' },
  { name: 'Silver', min: 800, max: 1199, color: '#C0C0C0', bgColor: 'rgba(192, 192, 192, 0.12)' },
  { name: 'Gold', min: 1200, max: 1599, color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.12)' },
  { name: 'Platinum', min: 1600, max: 1999, color: '#06B6D4', bgColor: 'rgba(6, 182, 212, 0.12)' },
  { name: 'Diamond', min: 2000, max: 2399, color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.12)' },
  { name: 'Grandmaster', min: 2400, max: Infinity, color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.12)' },
] as const;

export function getRank(elo: number): RankInfo {
  const clampedElo = Math.max(100, elo);

  for (const tier of TIERS) {
    if (clampedElo >= tier.min && clampedElo <= tier.max) {
      const range = tier.max === Infinity ? 600 : tier.max - tier.min + 1;
      const withinTier = clampedElo - tier.min;
      const divisionSize = range / 3;

      let division: number;
      if (tier.max === Infinity) {
        division = withinTier < 200 ? 3 : withinTier < 400 ? 2 : 1;
      } else {
        division = withinTier < divisionSize ? 3 : withinTier < divisionSize * 2 ? 2 : 1;
      }

      const nextTierElo = tier.max === Infinity ? clampedElo + 100 : tier.max + 1;
      const progress = tier.max === Infinity ? 1 : withinTier / range;

      const divisionLabel = ['I', 'II', 'III'][division - 1];

      return {
        tier: tier.name,
        division,
        name: `${tier.name} ${divisionLabel}`,
        color: tier.color,
        bgColor: tier.bgColor,
        nextTierElo,
        progress,
      };
    }
  }

  return getRank(100);
}

export function didRankChange(oldElo: number, newElo: number): boolean {
  const oldRank = getRank(oldElo);
  const newRank = getRank(newElo);
  return oldRank.tier !== newRank.tier;
}

export { TIERS };
