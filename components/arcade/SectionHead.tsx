interface SectionHeadProps {
  /** Two-digit section number e.g. "01" (without slash). */
  no?: string;
  title: string;
  color?: 'cyan' | 'magenta' | 'gold' | 'lime' | 'coral';
  className?: string;
}

const COLOR: Record<NonNullable<SectionHeadProps['color']>, string> = {
  cyan:    'text-cyan',
  magenta: 'text-magenta',
  gold:    'text-gold',
  lime:    'text-lime',
  coral:   'text-coral',
};

export function SectionHead({ no, title, color = 'magenta', className = '' }: SectionHeadProps) {
  return (
    <div className={`flex items-baseline gap-[14px] mb-[18px] ${className}`}>
      <div className={`font-mono text-[11px] uppercase tracking-[1.6px] ${COLOR[color]}`}>
        {no ? `/${no} — ` : ''}{title}
      </div>
      <div className="flex-1 h-px bg-edge" />
    </div>
  );
}
