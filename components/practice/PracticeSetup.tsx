'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Operation, PracticeConfig, PracticeDifficulty, OperationRange } from '@/types';
import { PRACTICE_DURATIONS, PRACTICE_DIFFICULTY_RANGES, PRACTICE_DIFFICULTY_LABELS } from '@/lib/constants';

interface PracticeSetupProps {
  config: PracticeConfig;
  onConfigChange: (config: Partial<PracticeConfig>) => void;
  onStart: () => void;
  personalBest: number | null;
}

const OPERATIONS: { value: Operation; label: string; symbol: string }[] = [
  { value: '+', label: 'Addition', symbol: '+' },
  { value: '-', label: 'Subtraction', symbol: '−' },
  { value: '*', label: 'Multiplication', symbol: '×' },
  { value: '/', label: 'Division', symbol: '÷' },
];

const DIFFICULTIES: PracticeDifficulty[] = ['beginner', 'standard', 'hard', 'expert'];

export function PracticeSetup({ config, onConfigChange, onStart, personalBest }: PracticeSetupProps) {
  const [showCustomRanges, setShowCustomRanges] = useState(false);
  const [customRanges, setCustomRanges] = useState<Record<Operation, OperationRange>>(
    () => PRACTICE_DIFFICULTY_RANGES[config.difficulty]
  );

  const toggleOperation = (op: Operation) => {
    const current = config.operations;
    if (current.includes(op)) {
      if (current.length <= 1) return; // at least one must be selected
      onConfigChange({ operations: current.filter((o) => o !== op) });
    } else {
      onConfigChange({ operations: [...current, op] });
    }
  };

  const handleDifficultyChange = (diff: PracticeDifficulty) => {
    onConfigChange({ difficulty: diff });
    setCustomRanges(PRACTICE_DIFFICULTY_RANGES[diff]);
    if (showCustomRanges) {
      onConfigChange({ difficulty: diff, customRanges: PRACTICE_DIFFICULTY_RANGES[diff] });
    }
  };

  const handleRangeChange = (op: Operation, field: keyof OperationRange, value: number) => {
    const updated = { ...customRanges, [op]: { ...customRanges[op], [field]: value } };

    // Auto-sync subtraction with addition, division with multiplication
    if (op === '+') {
      updated['-'] = { ...updated['+'] };
    } else if (op === '*') {
      updated['/'] = { ...updated['*'] };
    }

    setCustomRanges(updated);
    onConfigChange({ customRanges: updated });
  };

  const handleToggleCustom = () => {
    const next = !showCustomRanges;
    setShowCustomRanges(next);
    if (next) {
      onConfigChange({ customRanges: customRanges });
    } else {
      onConfigChange({ customRanges: undefined });
    }
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-[60vh] gap-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center">
        <h1 className="font-serif text-4xl font-normal text-ink">Practice Mode</h1>
        <p className="text-ink-tertiary text-[15px] font-normal mt-2">
          Timed speed drill. No rating impact.
        </p>
        {personalBest !== null && (
          <p className="text-accent text-[13px] font-mono mt-1">
            Personal Best: {personalBest}
          </p>
        )}
      </div>

      <div className="space-y-6 w-full max-w-md">
        {/* Operations */}
        <div>
          <label className="block text-[11px] tracking-[2px] text-ink-muted mb-3 uppercase">
            Operations
          </label>
          <div className="grid grid-cols-4 gap-2">
            {OPERATIONS.map((op) => (
              <button
                key={op.value}
                onClick={() => toggleOperation(op.value)}
                className={`py-3 rounded-sm font-mono text-lg transition-colors ${
                  config.operations.includes(op.value)
                    ? 'bg-btn text-btn-text'
                    : 'border border-edge text-ink-tertiary hover:text-ink-secondary hover:border-edge-strong'
                }`}
              >
                {op.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-[11px] tracking-[2px] text-ink-muted mb-3 uppercase">
            Duration
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PRACTICE_DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => onConfigChange({ duration: d })}
                className={`py-3 rounded-sm font-mono text-sm transition-colors ${
                  config.duration === d
                    ? 'bg-btn text-btn-text'
                    : 'border border-edge text-ink-tertiary hover:text-ink-secondary hover:border-edge-strong'
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-[11px] tracking-[2px] text-ink-muted mb-3 uppercase">
            Difficulty
          </label>
          <div className="grid grid-cols-4 gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => handleDifficultyChange(d)}
                className={`py-2.5 rounded-sm text-[13px] transition-colors ${
                  config.difficulty === d
                    ? 'bg-btn text-btn-text'
                    : 'border border-edge text-ink-tertiary hover:text-ink-secondary hover:border-edge-strong'
                }`}
              >
                {PRACTICE_DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        {/* Custom ranges toggle */}
        <div>
          <button
            onClick={handleToggleCustom}
            className="text-[12px] text-ink-muted hover:text-ink-secondary transition-colors flex items-center gap-1"
          >
            <span className={`transition-transform ${showCustomRanges ? 'rotate-90' : ''}`}>▸</span>
            Customize ranges
          </button>

          {showCustomRanges && (
            <motion.div
              className="mt-3 space-y-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {/* Addition + Subtraction */}
              <RangeEditor
                label="Addition"
                sublabel="Subtraction uses same ranges (reversed)"
                symbol="+"
                range={customRanges['+']}
                onChange={(field, val) => handleRangeChange('+', field, val)}
                enabled={config.operations.includes('+') || config.operations.includes('-')}
              />

              {/* Multiplication + Division */}
              <RangeEditor
                label="Multiplication"
                sublabel="Division uses same ranges (reversed)"
                symbol="×"
                range={customRanges['*']}
                onChange={(field, val) => handleRangeChange('*', field, val)}
                enabled={config.operations.includes('*') || config.operations.includes('/')}
              />
            </motion.div>
          )}
        </div>

        {/* Start */}
        <button
          onClick={onStart}
          className="w-full py-4 bg-btn text-btn-text text-sm font-semibold tracking-[1.5px] rounded-sm transition-colors hover:bg-btn-hover"
        >
          START
        </button>
      </div>
    </motion.div>
  );
}

function RangeEditor({
  label,
  sublabel,
  symbol,
  range,
  onChange,
  enabled,
}: {
  label: string;
  sublabel: string;
  symbol: string;
  range: OperationRange;
  onChange: (field: keyof OperationRange, val: number) => void;
  enabled: boolean;
}) {
  if (!enabled) return null;

  return (
    <div className="bg-card rounded-sm border border-edge-faint p-3">
      <div className="text-[11px] tracking-[1px] text-ink-muted mb-1 uppercase">{label}</div>
      <div className="text-[10px] text-ink-faint mb-2">{sublabel}</div>
      <div className="flex items-center gap-2 text-[13px] font-mono">
        <span className="text-ink-faint">(</span>
        <RangeInput value={range.min1} onChange={(v) => onChange('min1', v)} />
        <span className="text-ink-faint">to</span>
        <RangeInput value={range.max1} onChange={(v) => onChange('max1', v)} />
        <span className="text-ink-faint">)</span>
        <span className="text-accent">{symbol}</span>
        <span className="text-ink-faint">(</span>
        <RangeInput value={range.min2} onChange={(v) => onChange('min2', v)} />
        <span className="text-ink-faint">to</span>
        <RangeInput value={range.max2} onChange={(v) => onChange('max2', v)} />
        <span className="text-ink-faint">)</span>
      </div>
    </div>
  );
}

function RangeInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => {
        const v = parseInt(e.target.value);
        if (!isNaN(v) && v >= 1) onChange(v);
      }}
      className="w-14 px-2 py-1 text-center bg-page border border-edge rounded-sm text-ink font-mono text-[13px] focus:outline-none focus:border-edge-strong"
    />
  );
}
