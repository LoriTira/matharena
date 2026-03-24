'use client';

interface CardProps {
  variant?: 'default' | 'interactive' | 'highlight';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const variantStyles: Record<string, string> = {
  default: 'border border-white/[0.06] bg-white/[0.015]',
  interactive:
    'border border-white/[0.06] bg-white/[0.015] hover:border-white/[0.12] hover:scale-[1.005] transition-all cursor-pointer',
  highlight: 'border border-[#F59E0B]/20 bg-[#F59E0B]/[0.04]',
};

export function Card({
  variant = 'default',
  className = '',
  children,
  onClick,
}: CardProps) {
  return (
    <div
      className={`rounded-sm p-4 ${variantStyles[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
