'use client';

interface CardProps {
  variant?: 'default' | 'interactive' | 'highlight';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const variantStyles: Record<string, string> = {
  default: 'border-2 border-edge-strong bg-panel',
  interactive:
    'border-2 border-edge-strong bg-panel hover:border-edge-bold hover:scale-[1.005] transition-all cursor-pointer',
  highlight: 'border-2 border-accent bg-accent-glow shadow-[0_0_30px_var(--accent-glow)]',
};

export function Card({
  variant = 'default',
  className = '',
  children,
  onClick,
}: CardProps) {
  return (
    <div
      className={`rounded-lg p-4 ${variantStyles[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
