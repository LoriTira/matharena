'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Operation, PracticeConfig, PracticeDifficulty, OperationRange } from '@/types';
import { PRACTICE_DURATIONS, PRACTICE_DIFFICULTY_RANGES, PRACTICE_DIFFICULTY_LABELS } from '@/lib/constants';
import { Panel } from '@/components/arcade/Panel';
import { SectionHead } from '@/components/arcade/SectionHead';
import { Btn } from '@/components/arcade/Btn';

interface PracticeSetupProps {
  config: PracticeConfig;
  onConfigChange: (config: Partial<PracticeConfig>) => void;
  onStart: () => void;
  personalBest: number | null;
}

const OPERATIONS: { value: Operation; label: string; symbol: string; color: string }[] = [
  { value: '+', label: 'Add',      symbol: '+', color: 'lime' },
  { value: '-', label: 'Subtract', symbol: '−', color: 'gold' },
  { value: '*', label: 'Multiply', symbol: '×', color: 'magenta' },
  { value: '/', label: 'Divide',   symbol: '÷', color: 'cyan' },
];

const DIFFICULTIES: PracticeDifficulty[] = ['beginner', 'standard', 'hard', 'expert'];

const DIFF_TAGLINES: Record<PracticeDifficulty, string> = {
  beginner: '1–20',
  standard: '1–99',
  hard:     '10–999',
  expert:   'mixed',
};

const COLOR_CLASS: Record<string, { text: string; border: string; bg: string }> = {
  lime:    { text: 'text-lime',    border: 'border-lime',    bg: 'rgba(166,255,77,0.10)' },
  gold:    { text: 'text-gold',    border: 'border-gold',    bg: 'rgba(255,210,63,0.10)' },
  magenta: { text: 'text-magenta', border: 'border-magenta', bg: 'rgba(255,42,127,0.10)' },
  cyan:    { text: 'text-cyan',    border: 'border-cyan',    bg: 'rgba(54,228,255,0.10)' },
};

export function PracticeSetup({ config, onConfigChange, onStart, personalBest }: PracticeSetupProps) {
  const [showCustomRanges, setShowCustomRanges] = useState(false);
  const [customRanges, setCustomRanges] = useState<Record<Operation, OperationRange>>(
    () => PRACTICE_DIFFICULTY_RANGES[config.difficulty]
  );

  const toggleOperation = (op: Operation) => {
    const current = config.operations;
    if (current.includes(op)) {
      if (current.length <= 1) return;
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
    if (op === '+') updated['-'] = { ...updated['+'] };
    else if (op === '*') updated['/'] = { ...updated['*'] };
    setCustomRanges(updated);
    onConfigChange({ customRanges: updated });
  };

  const handleToggleCustom = () => {
    const next = !showCustomRanges;
    setShowCustomRanges(next);
    onConfigChange({ customRanges: next ? customRanges : undefined });
  };

  return (
    <motion.div
      className="space-y-[14px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="mb-[18px]">
        <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[2px] mb-[8px]">
          / Drill room
        </div>
        <h1 className="font-display font-extrabold text-[34px] md:text-[56px] tracking-[-1.5px] leading-[1]">
          Target your <span className="text-magenta italic">weakness.</span>
        </h1>
        <div className="mt-[10px] font-mono text-[12px] text-ink-tertiary tracking-[0.5px] uppercase">
          Unranked · no Elo changes · solo mode
          {personalBest !== null && (
            <> · <span className="text-accent">PB {personalBest}</span></>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-[14px]">
        {/* Operations */}
        <Panel padding={28}>
          <SectionHead no="01" title="Operations" color="magenta" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px]">
            {OPERATIONS.map((op) => {
              const on = config.operations.includes(op.value);
              const c = COLOR_CLASS[op.color];
              return (
                <button
                  key={op.value}
                  onClick={() => toggleOperation(op.value)}
                  className={`p-[14px] border transition-colors ${
                    on ? `${c.border}` : 'border-edge hover:border-edge-strong'
                  }`}
                  style={{
                    background: on ? c.bg : 'var(--bg-base)',
                    boxShadow: on ? `inset 0 0 18px ${op.color === 'lime' ? 'rgba(166,255,77,0.22)' : op.color === 'gold' ? 'rgba(255,210,63,0.22)' : op.color === 'magenta' ? 'rgba(255,42,127,0.22)' : 'rgba(54,228,255,0.22)'}` : 'none',
                  }}
                >
                  <div className="flex justify-between items-center mb-[6px]">
                    <span
                      className={`font-display font-extrabold text-[28px] leading-none ${on ? c.text : 'text-ink-tertiary'}`}
                    >
                      {op.symbol}
                    </span>
                    <div
                      className="w-[14px] h-[14px] border"
                      style={{
                        borderColor: on ? `var(--neon-${op.color})` : 'var(--border-strong)',
                        background: on ? `var(--neon-${op.color})` : 'transparent',
                      }}
                    />
                  </div>
                  <div className="font-mono text-[10px] text-ink-tertiary uppercase tracking-[1.2px]">
                    {op.label}
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        {/* Difficulty */}
        <Panel padding={28}>
          <SectionHead no="02" title="Difficulty" color="gold" />
          <div className="flex flex-col gap-[10px]">
            {DIFFICULTIES.map((d) => {
              const on = config.difficulty === d;
              return (
                <button
                  key={d}
                  onClick={() => handleDifficultyChange(d)}
                  className={`flex justify-between items-center px-[14px] py-[12px] border transition-colors ${
                    on ? 'border-gold' : 'border-edge hover:border-edge-strong'
                  }`}
                  style={{ background: on ? 'rgba(255,210,63,0.06)' : 'var(--bg-base)' }}
                >
                  <div className="text-left">
                    <div className={`font-display font-bold text-[14px] ${on ? 'text-gold' : 'text-ink'}`}>
                      {PRACTICE_DIFFICULTY_LABELS[d]}
                    </div>
                    <div className="font-mono text-[10px] text-ink-tertiary uppercase tracking-[1.2px] mt-[2px]">
                      {DIFF_TAGLINES[d]}
                    </div>
                  </div>
                  <div
                    className="w-[18px] h-[18px] rounded-full"
                    style={{
                      border: `2px solid ${on ? 'var(--neon-gold)' : 'var(--border-strong)'}`,
                      background: on ? 'var(--neon-gold)' : 'transparent',
                    }}
                  />
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-[20px] border-t border-edge">
            <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[1.4px] mb-[10px]">
              Duration
            </div>
            <div className="grid grid-cols-3 gap-[6px]">
              {PRACTICE_DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => onConfigChange({ duration: d })}
                  className={`py-[8px] text-center font-mono text-[11px] font-bold tracking-[1.2px] border transition-colors ${
                    config.duration === d ? 'border-cyan text-cyan' : 'border-edge text-ink-tertiary hover:text-ink'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* Custom ranges */}
      <div>
        <button
          onClick={handleToggleCustom}
          className="font-mono text-[11px] text-ink-tertiary hover:text-cyan tracking-[1.2px] uppercase transition-colors flex items-center gap-[6px]"
        >
          <span className={`transition-transform ${showCustomRanges ? 'rotate-90' : ''}`}>▸</span>
          Customize ranges
        </button>

        {showCustomRanges && (
          <motion.div
            className="mt-[14px] grid grid-cols-1 md:grid-cols-2 gap-[10px]"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <RangeEditor
              label="Addition"
              sublabel="Subtraction mirrors"
              symbol="+"
              range={customRanges['+']}
              onChange={(field, val) => handleRangeChange('+', field, val)}
              enabled={config.operations.includes('+') || config.operations.includes('-')}
            />
            <RangeEditor
              label="Multiplication"
              sublabel="Division mirrors"
              symbol="×"
              range={customRanges['*']}
              onChange={(field, val) => handleRangeChange('*', field, val)}
              enabled={config.operations.includes('*') || config.operations.includes('/')}
            />
          </motion.div>
        )}
      </div>

      <div className="flex justify-center pt-2">
        <Btn size="lg" variant="primary" onClick={onStart} full>
          ▶ Start drill
        </Btn>
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
    <div className="border border-edge bg-panel px-[14px] py-[12px]">
      <div className="font-mono text-[10px] text-ink-tertiary uppercase tracking-[1.2px]">{label}</div>
      <div className="font-mono text-[9px] text-ink-faint tracking-[0.8px] mt-[2px] mb-[8px]">{sublabel}</div>
      <div className="flex items-center gap-[6px] font-mono text-[13px] flex-wrap">
        <span className="text-ink-faint">(</span>
        <RangeInput value={range.min1} onChange={(v) => onChange('min1', v)} />
        <span className="text-ink-faint">to</span>
        <RangeInput value={range.max1} onChange={(v) => onChange('max1', v)} />
        <span className="text-ink-faint">)</span>
        <span className="text-magenta">{symbol}</span>
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
      className="w-14 px-2 py-1 text-center bg-page border border-edge text-ink font-mono text-[13px] focus:outline-none focus:border-cyan transition-colors"
    />
  );
}
