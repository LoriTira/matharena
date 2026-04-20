import { CSSProperties, ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** px — defaults to 24 (mobile: 20 when caller uses responsive pattern). */
  padding?: number | string;
  /** Highlight with accent border + glow (used for "Coach suggests" etc.). */
  highlight?: boolean;
}

export function Panel({ children, className = '', style, padding = 24, highlight = false }: PanelProps) {
  return (
    <div
      className={`border ${highlight ? 'border-cyan bg-accent-glow' : 'border-edge-strong bg-panel'} ${className}`}
      style={{ padding, ...style }}
    >
      {children}
    </div>
  );
}
