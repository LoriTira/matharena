import { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

type Variant = 'primary' | 'gold' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface BtnProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  /** Offset shadow color override. Defaults: primary/gold → magenta, ghost/danger → none. */
  shadow?: 'magenta' | 'cyan' | 'none';
  full?: boolean;
}

const VARIANT: Record<Variant, string> = {
  primary: 'bg-cyan text-[#0a0612] border border-ink',
  gold:    'bg-gold  text-[#0a0612] border border-ink',
  ghost:   'bg-transparent text-ink border border-edge-strong hover:border-ink',
  danger:  'bg-danger text-[#fff] border border-ink',
};

const SIZE: Record<Size, { pad: string; fs: string }> = {
  sm: { pad: 'px-[14px] py-[8px]',  fs: 'text-[10px]' },
  md: { pad: 'px-[20px] py-[12px]', fs: 'text-[12px]' },
  lg: { pad: 'px-[28px] py-[16px]', fs: 'text-[13px]' },
};

export function Btn({
  children,
  variant = 'primary',
  size = 'md',
  shadow,
  full = false,
  className = '',
  style,
  ...rest
}: BtnProps) {
  const { pad, fs } = SIZE[size];
  const defaultShadow = variant === 'primary' || variant === 'gold' ? 'magenta' : 'none';
  const shadowColor = shadow ?? defaultShadow;
  const shadowStyle: CSSProperties =
    shadowColor === 'magenta' ? { boxShadow: '4px 4px 0 var(--neon-magenta)' }
    : shadowColor === 'cyan'  ? { boxShadow: '4px 4px 0 var(--neon-cyan)' }
    : {};

  return (
    <button
      {...rest}
      className={`font-mono ${fs} font-bold uppercase tracking-[1.3px] ${pad} ${VARIANT[variant]} ${full ? 'w-full' : ''} cursor-pointer transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:[box-shadow:2px_2px_0_var(--neon-magenta)] active:translate-x-[4px] active:translate-y-[4px] active:[box-shadow:0_0_0_var(--neon-magenta)] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{ ...shadowStyle, ...style }}
    >
      {children}
    </button>
  );
}
