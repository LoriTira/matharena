import { CSSProperties, ReactNode } from 'react';

type TagColor = 'cyan' | 'magenta' | 'gold' | 'lime' | 'coral' | 'danger' | 'ink';

interface TagProps {
  children: ReactNode;
  color?: TagColor;
  className?: string;
  style?: CSSProperties;
}

const COLOR_CLASSES: Record<TagColor, string> = {
  cyan:    'text-cyan border-cyan',
  magenta: 'text-magenta border-magenta',
  gold:    'text-gold border-gold',
  lime:    'text-lime border-lime',
  coral:   'text-coral border-coral',
  danger:  'text-danger border-danger',
  ink:     'text-ink border-edge-strong',
};

export function Tag({ children, color = 'cyan', className = '', style }: TagProps) {
  return (
    <span
      className={`inline-block font-mono text-[10px] uppercase tracking-[1.6px] border px-2 py-[3px] ${COLOR_CLASSES[color]} ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}
