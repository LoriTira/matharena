interface BarProps {
  /** 0–1 */
  progress: number;
  color?: 'cyan' | 'magenta' | 'gold' | 'lime' | 'coral';
  height?: number;
  className?: string;
}

const COLOR: Record<NonNullable<BarProps['color']>, string> = {
  cyan:    'var(--neon-cyan)',
  magenta: 'var(--neon-magenta)',
  gold:    'var(--neon-gold)',
  lime:    'var(--neon-lime)',
  coral:   'var(--neon-coral)',
};

export function Bar({ progress, color = 'cyan', height = 10, className = '' }: BarProps) {
  const pct = Math.min(1, Math.max(0, progress)) * 100;
  const c = COLOR[color];
  return (
    <div
      className={`relative overflow-hidden bg-panel border border-edge ${className}`}
      style={{ height }}
    >
      <div
        className="absolute top-0 bottom-0 left-0"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${c}22, ${c})`,
          borderRight: pct > 0 ? `2px solid ${c}` : 'none',
          boxShadow: `inset 0 0 10px ${c}88`,
        }}
      />
    </div>
  );
}
