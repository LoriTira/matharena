'use client';

import { getRank } from '@/lib/ranks';

interface RankBadgeProps {
  elo: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function TierIcon({ tier, color, size }: { tier: string; color: string; size: number }) {
  const half = size / 2;

  switch (tier) {
    case 'Bronze':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={half} cy={half} r={half * 0.7} fill="none" stroke={color} strokeWidth={1.5} />
        </svg>
      );
    case 'Silver':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon
            points={`${half},${size * 0.1} ${size * 0.9},${half} ${half},${size * 0.9} ${size * 0.1},${half}`}
            fill="none" stroke={color} strokeWidth={1.5}
          />
        </svg>
      );
    case 'Gold':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon
            points={`${half},${size * 0.05} ${size * 0.65},${size * 0.35} ${size * 0.95},${size * 0.4} ${size * 0.72},${size * 0.68} ${size * 0.8},${size * 0.95} ${half},${size * 0.78} ${size * 0.2},${size * 0.95} ${size * 0.28},${size * 0.68} ${size * 0.05},${size * 0.4} ${size * 0.35},${size * 0.35}`}
            fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round"
          />
        </svg>
      );
    case 'Platinum':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon
            points={`${half},${size * 0.08} ${size * 0.82},${size * 0.32} ${size * 0.82},${size * 0.68} ${half},${size * 0.92} ${size * 0.18},${size * 0.68} ${size * 0.18},${size * 0.32}`}
            fill="none" stroke={color} strokeWidth={1.5}
          />
        </svg>
      );
    case 'Diamond':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon
            points={`${half},${size * 0.05} ${size * 0.85},${size * 0.35} ${half},${size * 0.95} ${size * 0.15},${size * 0.35}`}
            fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.5}
          />
        </svg>
      );
    case 'Grandmaster':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon
            points={`${half},${size * 0.08} ${size * 0.82},${size * 0.32} ${size * 0.82},${size * 0.68} ${half},${size * 0.92} ${size * 0.18},${size * 0.68} ${size * 0.18},${size * 0.32}`}
            fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.5}
          />
          <circle cx={half} cy={half} r={half * 0.3} fill={color} fillOpacity={0.4} />
        </svg>
      );
    default:
      return null;
  }
}

const sizes = { sm: 14, md: 20, lg: 28 };

export function RankBadge({ elo, size = 'md', showLabel = false }: RankBadgeProps) {
  const rank = getRank(elo);
  const iconSize = sizes[size];
  const textSize = size === 'sm' ? 'text-[11px]' : size === 'md' ? 'text-[11px]' : 'text-[13px]';

  return (
    <span className="inline-flex items-center gap-1.5">
      <TierIcon tier={rank.tier} color="var(--accent)" size={iconSize} />
      {showLabel && (
        <span className={`${textSize} font-medium tracking-wide text-accent`}>
          {rank.name}
        </span>
      )}
    </span>
  );
}
