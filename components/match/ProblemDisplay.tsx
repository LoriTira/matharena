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
    <div className="flex items-center justify-center gap-4 py-8">
      <span className="text-5xl md:text-7xl font-bold text-white tabular-nums">
        {operand1.toLocaleString()}
      </span>
      <span className="text-4xl md:text-6xl font-bold text-blue-400">
        {operationSymbols[operation] || operation}
      </span>
      <span className="text-5xl md:text-7xl font-bold text-white tabular-nums">
        {operand2.toLocaleString()}
      </span>
      <span className="text-4xl md:text-6xl font-bold text-gray-500">
        =
      </span>
      <span className="text-4xl md:text-6xl font-bold text-gray-600">
        ?
      </span>
    </div>
  );
}
