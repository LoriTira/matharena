import { CSSProperties } from 'react';

interface BigNumProps {
  n: string | number;
  color?: 'ink' | 'ink-dim' | 'cyan' | 'magenta' | 'gold' | 'lime';
  size?: number;
  className?: string;
  style?: CSSProperties;
}

const COLOR: Record<NonNullable<BigNumProps['color']>, string> = {
  'ink':      'text-ink',
  'ink-dim':  'text-ink-tertiary',
  'cyan':     'text-cyan',
  'magenta':  'text-magenta',
  'gold':     'text-gold',
  'lime':     'text-lime',
};

export function BigNum({ n, color = 'ink', size = 48, className = '', style }: BigNumProps) {
  return (
    <span
      className={`font-display font-extrabold leading-none tabular-nums ${COLOR[color]} ${className}`}
      style={{
        fontSize: size,
        letterSpacing: -size * 0.03,
        ...style,
      }}
    >
      {n}
    </span>
  );
}
