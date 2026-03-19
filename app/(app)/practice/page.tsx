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
        <h1 className="text-4xl font-bold text-white">Practice Mode</h1>
        <p className="text-gray-400 text-lg">Train your mental math skills. No rating impact.</p>

        <div className="space-y-6 w-full max-w-md">
          {/* Operation selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Operation</label>
            <div className="grid grid-cols-4 gap-2">
              {operations.map((op) => (
                <button
                  key={op.value}
                  onClick={() => setOperation(op.value)}
                  className={`py-3 rounded-lg font-bold text-lg transition-colors ${
                    operation === op.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {op.symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Difficulty: {difficulty}
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={difficulty}
              onChange={(e) => setDifficulty(parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Beginner</span>
              <span>Master</span>
            </div>
          </div>

          <button
            onClick={start}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold rounded-xl transition-colors"
          >
            Start Practice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="flex items-center gap-8">
        <div className="text-center">
          <div className="text-sm text-gray-400">Correct</div>
          <div className="text-2xl font-bold text-green-400">{stats.correct}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-400">Wrong</div>
          <div className="text-2xl font-bold text-red-400">{stats.wrong}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-400">Streak</div>
          <div className="text-2xl font-bold text-yellow-400">{stats.streak}</div>
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
        className="text-gray-500 hover:text-white transition-colors"
      >
        ← Back to settings
      </button>
    </div>
  );
}
