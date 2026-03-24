'use client';

interface CardProps {
  variant?: 'default' | 'interactive' | 'highlight';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const variantStyles: Record<string, string> = {
  default: 'border border-edge bg-card',
  interactive:
    'border border-edge bg-card hover:border-edge-strong hover:scale-[1.005] transition-all cursor-pointer',
  highlight: 'border border-accent/20 bg-accent-glow',
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
