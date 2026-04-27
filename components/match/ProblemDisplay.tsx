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

export function ProblemDisplay({ operand1, operand2, operation }: ProblemDisplayProps) {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-5 py-6 sm:py-8">
      <span className="text-5xl sm:text-7xl md:text-8xl font-mono font-black text-ink tabular-nums tracking-tight">
        {operand1.toLocaleString()}
      </span>
      <span className="text-4xl sm:text-6xl md:text-7xl font-mono font-black text-accent">
        {operationSymbols[operation] || operation}
      </span>
      <span className="text-5xl sm:text-7xl md:text-8xl font-mono font-black text-ink tabular-nums tracking-tight">
        {operand2.toLocaleString()}
      </span>
    </div>
  );
}
