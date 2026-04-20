import { NEON } from './tokens';

interface SparklineProps {
  points: number[];
  color?: 'cyan' | 'magenta' | 'gold' | 'lime';
  width?: number;
  height?: number;
  className?: string;
}

const COLOR: Record<NonNullable<SparklineProps['color']>, string> = {
  cyan:    NEON.cyan,
  magenta: NEON.magenta,
  gold:    NEON.gold,
  lime:    NEON.lime,
};

/**
 * Cyan-glow sparkline rendered as SVG with a drop-shadow filter. Auto-scales
 * to min/max of the point series. Last point gets a dot with same glow.
 */
export function Sparkline({
  points,
  color = 'cyan',
  width = 600,
  height = 72,
  className = '',
}: SparklineProps) {
  if (points.length < 2) return null;

  const c = COLOR[color];
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);

  const d = points
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const lastIdx = points.length - 1;
  const lastX = lastIdx * step;
  const lastY = height - ((points[lastIdx] - min) / range) * height;

  const gradId = `spark-${color}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full h-full ${className}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={c} stopOpacity="0.4" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${width},${height} L0,${height} Z`} fill={`url(#${gradId})`} />
      <path
        d={d}
        fill="none"
        stroke={c}
        strokeWidth="1.5"
        style={{ filter: `drop-shadow(0 0 4px ${c})` }}
      />
      <circle
        cx={lastX}
        cy={lastY}
        r="3"
        fill={c}
        style={{ filter: `drop-shadow(0 0 4px ${c})` }}
      />
    </svg>
  );
}
