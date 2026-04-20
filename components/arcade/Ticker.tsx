interface TickerProps {
  items: string[];
  /** Index modulo 3 gets highlighted in lime — set false to skip. */
  highlightEvery?: number | false;
  className?: string;
}

/**
 * Horizontal scrolling ticker for live-game events. The items array is
 * duplicated so the translate-X animation can loop seamlessly without
 * re-rendering. All motion gated by prefers-reduced-motion.
 */
export function Ticker({ items, highlightEvery = 3, className = '' }: TickerProps) {
  return (
    <div
      className={`border-t border-b border-edge-strong bg-panel overflow-hidden py-[12px] font-mono text-[11px] uppercase tracking-[1.4px] text-ink-tertiary whitespace-nowrap ${className}`}
    >
      <div className="flex animate-ticker w-max">
        {[...items, ...items].map((t, i) => (
          <span
            key={i}
            className={`mr-[48px] ${
              highlightEvery !== false && i % highlightEvery === 0 ? 'text-lime' : 'text-ink-tertiary'
            }`}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
