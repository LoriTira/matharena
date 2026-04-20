'use client';

interface ProblemDisplayProps {
  operand1: number;
  operand2: number;
  operation: string;
}

const operationSymbols: Record<string, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

const operationColor: Record<string, string> = {
  '+': 'var(--neon-lime)',
  '-': 'var(--neon-gold)',
  '*': 'var(--neon-magenta)',
  '/': 'var(--neon-cyan)',
};

export function ProblemDisplay({ operand1, operand2, operation }: ProblemDisplayProps) {
  const opColor = operationColor[operation] ?? 'var(--neon-magenta)';
  return (
    <div className="flex items-center justify-center gap-2 md:gap-4 py-6 flex-wrap">
      <span
        className="font-display font-extrabold text-[48px] md:text-[132px] leading-none tracking-[-2px] md:tracking-[-6px] text-ink tabular-nums"
        style={{ textShadow: '0 0 30px rgba(54,228,255,0.2)' }}
      >
        {operand1.toLocaleString()}
      </span>
      <span
        className="font-display font-extrabold text-[40px] md:text-[108px] leading-none"
        style={{ color: opColor, textShadow: `0 0 24px ${opColor}55` }}
      >
        {operationSymbols[operation] || operation}
      </span>
      <span
        className="font-display font-extrabold text-[48px] md:text-[132px] leading-none tracking-[-2px] md:tracking-[-6px] text-ink tabular-nums"
        style={{ textShadow: '0 0 30px rgba(54,228,255,0.2)' }}
      >
        {operand2.toLocaleString()}
      </span>
    </div>
  );
}
