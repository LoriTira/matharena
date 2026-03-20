'use client';

import { useState, useCallback } from 'react';
import { ProblemDisplay } from '@/components/match/ProblemDisplay';
import { AnswerInput } from '@/components/match/AnswerInput';
import type { Operation, Problem } from '@/types';

const operations: { value: Operation; label: string; symbol: string }[] = [
  { value: '+', label: 'Addition', symbol: '+' },
  { value: '-', label: 'Subtraction', symbol: '−' },
  { value: '*', label: 'Multiplication', symbol: '×' },
  { value: '/', label: 'Division', symbol: '÷' },
];

export default function PracticePage() {
  const [operation, setOperation] = useState<Operation>('+');
  const [difficulty, setDifficulty] = useState(1);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, streak: 0 });
  const [started, setStarted] = useState(false);

  const fetchProblem = useCallback(async () => {
    const res = await fetch(
      `/api/practice/problem?operation=${encodeURIComponent(operation)}&difficulty=${difficulty}&count=1`
    );
    const data = await res.json();
    if (data.problems?.[0]) {
      setProblem(data.problems[0]);
    }
  }, [operation, difficulty]);

  const start = () => {
    setStarted(true);
    setStats({ correct: 0, wrong: 0, streak: 0 });
    fetchProblem();
  };

  const handleSubmit = (answer: number) => {
    if (!problem) return;

    const feedbackFn = (window as unknown as Record<string, unknown>).__answerInputFeedback as
      | ((correct: boolean) => void)
      | undefined;

    if (answer === problem.answer) {
      feedbackFn?.(true);
      setStats((s) => ({ correct: s.correct + 1, wrong: s.wrong, streak: s.streak + 1 }));
      fetchProblem();
    } else {
      feedbackFn?.(false);
      setStats((s) => ({ correct: s.correct, wrong: s.wrong + 1, streak: 0 }));
    }
  };

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
        <h1 className="font-serif text-4xl font-light text-white/90">Practice Mode</h1>
        <p className="text-white/35 text-[15px] font-light">Train your mental math skills. No rating impact.</p>

        <div className="space-y-6 w-full max-w-md">
          {/* Operation selector */}
          <div>
            <label className="block text-[9px] tracking-[2px] text-white/25 mb-3 uppercase">Operation</label>
            <div className="grid grid-cols-4 gap-2">
              {operations.map((op) => (
                <button
                  key={op.value}
                  onClick={() => setOperation(op.value)}
                  className={`py-3 rounded-sm font-mono text-lg transition-colors ${
                    operation === op.value
                      ? 'bg-white/90 text-[#050505]'
                      : 'border border-white/[0.08] text-white/40 hover:text-white/60 hover:border-white/15'
                  }`}
                >
                  {op.symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty selector */}
          <div>
            <label className="block text-[9px] tracking-[2px] text-white/25 mb-3 uppercase">
              Difficulty: <span className="font-mono text-white/50">{difficulty}</span>
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={difficulty}
              onChange={(e) => setDifficulty(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-white/20 mt-2 tracking-wide">
              <span>Beginner</span>
              <span>Master</span>
            </div>
          </div>

          <button
            onClick={start}
            className="w-full py-4 bg-white/90 text-[#050505] text-sm font-semibold tracking-[1.5px] rounded-sm transition-colors hover:bg-white"
          >
            START PRACTICE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="flex items-center gap-8">
        <div className="text-center">
          <div className="text-[9px] tracking-[2px] text-white/20 mb-1">CORRECT</div>
          <div className="font-mono text-2xl text-white/70 tabular-nums">{stats.correct}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] tracking-[2px] text-white/20 mb-1">WRONG</div>
          <div className="font-mono text-2xl text-white/30 tabular-nums">{stats.wrong}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] tracking-[2px] text-white/20 mb-1">STREAK</div>
          <div className="font-mono text-2xl text-white/50 tabular-nums">{stats.streak}</div>
        </div>
      </div>

      {problem && (
        <>
          <ProblemDisplay
            operand1={problem.operand1}
            operand2={problem.operand2}
            operation={problem.operation}
          />
          <AnswerInput onSubmit={handleSubmit} />
        </>
      )}

      <button
        onClick={() => {
          setStarted(false);
          setProblem(null);
        }}
        className="text-white/25 text-sm underline underline-offset-2 decoration-white/10 hover:text-white/50 transition-colors"
      >
        Back to settings
      </button>
    </div>
  );
}
