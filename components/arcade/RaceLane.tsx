import { RankPip } from './RankPip';
import { type Tier } from './tokens';

interface RaceLaneProps {
  /** Highlights this lane (you) with color border + glow. */
  you?: boolean;
  color: 'cyan' | 'magenta';
  name: string;
  elo: number;
  tier: Tier;
  /** 0–1 */
  progress: number;
  streak?: number;
  avatar?: string;
  mobile?: boolean;
  /** Total gates (ticks) to render. Default 10. */
  gates?: number;
}

const COLOR_HEX: Record<RaceLaneProps['color'], string> = {
  cyan:    'var(--neon-cyan)',
  magenta: 'var(--neon-magenta)',
};

/**
 * The race-track duel lane — the centerpiece of the live duel and landing
 * demo. Shows avatar + name + rank + tracking bar with 10 gates and a
 * chevron runner at the current progress.
 */
export function RaceLane({
  you = false,
  color,
  name,
  elo,
  tier,
  progress,
  streak,
  avatar,
  mobile = false,
  gates = 10,
}: RaceLaneProps) {
  const c = COLOR_HEX[color];
  const pct = Math.min(1, Math.max(0, progress)) * 100;

  return (
    <div
      className={`border bg-panel ${mobile ? 'px-[12px] py-[10px]' : 'px-[18px] py-[14px]'}`}
      style={{
        borderColor: you ? c : 'var(--border-default)',
        boxShadow: you ? `0 0 20px ${c}33` : 'none',
      }}
    >
      <div className="flex items-center justify-between gap-[10px] mb-[8px]">
        <div className="flex items-center gap-[10px] min-w-0">
          {avatar && (
            <div
              className="grid place-items-center font-mono font-bold text-[12px] text-[#0a0612]"
              style={{
                width: mobile ? 24 : 30,
                height: mobile ? 24 : 30,
                background: c,
                boxShadow: `0 0 12px ${c}88`,
              }}
            >
              {avatar}
            </div>
          )}
          <span className={`font-display font-bold ${mobile ? 'text-[13px]' : 'text-[15px]'} truncate`}>
            {you && (
              <span className="text-cyan mr-[6px] font-mono text-[10px] tracking-[1.4px]">YOU</span>
            )}
            {name}
          </span>
          <RankPip tier={tier} size={mobile ? 16 : 20} />
          <span className="font-mono text-[11px] text-ink-tertiary">{elo}</span>
        </div>
        {streak !== undefined && (
          <div className="flex gap-[10px] font-mono text-[10px] text-ink-tertiary uppercase tracking-[1.2px]">
            <span className="text-coral">🔥 {streak}</span>
          </div>
        )}
      </div>

      {/* Track */}
      <div
        className="relative bg-page border border-edge overflow-hidden"
        style={{ height: mobile ? 22 : 32 }}
      >
        {/* Gate ticks */}
        {Array.from({ length: gates }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-edge"
            style={{ left: `${((i + 1) / gates) * 100}%` }}
          />
        ))}
        {/* Fill */}
        <div
          className="absolute top-0 bottom-0 left-0 transition-[width] duration-300 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${c}22, ${c}66, ${c})`,
            borderRight: pct > 0 ? `2px solid ${c}` : 'none',
            boxShadow: `inset 0 0 14px ${c}88`,
          }}
        />
        {/* Chevron runner */}
        <div
          className="absolute transition-[left] duration-300 ease-out"
          style={{
            top: 3,
            bottom: 3,
            left: `calc(${pct}% - 14px)`,
            width: 22,
            background: c,
            clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
            boxShadow: `0 0 16px ${c}`,
          }}
        />
      </div>
    </div>
  );
}
