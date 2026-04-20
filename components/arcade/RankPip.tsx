import { TIER_COLORS, type Tier } from './tokens';

interface RankPipProps {
  tier: Tier;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

export function RankPip({ tier, size = 24, showLabel = false, className = '' }: RankPipProps) {
  const c = TIER_COLORS[tier];
  return (
    <div className={`inline-flex items-center gap-[6px] ${className}`}>
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 30% 30%, ${c}, ${c}22)`,
          border: `2px solid ${c}`,
          boxShadow: `0 0 10px ${c}66`,
        }}
      />
      {showLabel && (
        <span
          className="font-mono text-[11px] uppercase tracking-[1.2px] font-bold"
          style={{ color: c }}
        >
          {tier}
        </span>
      )}
    </div>
  );
}
