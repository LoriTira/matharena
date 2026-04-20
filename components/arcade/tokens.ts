/**
 * Arcade design tokens — shared constants used by primitives for tier colors
 * and palette-based inline styles where CSS variables can't reach (e.g. SVG
 * strokes, dynamic hex interpolation). Single source of truth for Direction A.
 *
 * For static colors, prefer the CSS variables exposed via Tailwind
 * (`text-cyan`, `border-magenta`, etc.) over importing these constants.
 */

// Rank tiers — 8 stops from Wood to Grand Master
export const TIER_COLORS = {
  Wood:     '#8b6f47',
  Bronze:   '#c57a3e',
  Silver:   '#c4c9d0',
  Gold:     '#ffd23f',
  Platinum: '#c0f5e9',
  Diamond:  '#36e4ff',
  Master:   '#ff2a7f',
  Grand:    '#fef6e4',
} as const;

export type Tier = keyof typeof TIER_COLORS;

export const TIER_ORDER: Tier[] = [
  'Wood', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grand',
];

export const TIER_RANGES: Record<Tier, [number, number]> = {
  Wood:     [0, 499],
  Bronze:   [500, 999],
  Silver:   [1000, 1299],
  Gold:     [1300, 1599],
  Platinum: [1600, 1799],
  Diamond:  [1800, 2099],
  Master:   [2100, 2399],
  Grand:    [2400, 9999],
};

export function tierForElo(elo: number): Tier {
  for (const t of TIER_ORDER) {
    const [lo, hi] = TIER_RANGES[t];
    if (elo >= lo && elo <= hi) return t;
  }
  return 'Wood';
}

// Neon palette — hex mirror of the CSS vars for use in SVG and inline-style
// interpolation. Dark-mode values only; light theme still works because most
// uses are on dark duel chrome or share-safe accents.
export const NEON = {
  magenta: '#ff2a7f',
  cyan:    '#36e4ff',
  gold:    '#ffd23f',
  lime:    '#a6ff4d',
  coral:   '#ff8b3d',
  danger:  '#ff4d6d',
  ink:     '#fef6e4',
  inkDim:  'rgba(254,246,228,0.62)',
  bg:      '#0a0612',
  bgAlt:   '#120a1f',
  edge:    'rgba(254,246,228,0.12)',
} as const;

export type NeonColor = keyof typeof NEON;
