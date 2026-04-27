'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export type CountdownValue = number | 'GO!' | null;

interface CountdownProps {
  value?: CountdownValue;
  onComplete?: () => void;
  startAt?: number;
  stepMs?: number;
  goHoldMs?: number;
}

export function Countdown({
  value,
  onComplete,
  startAt = 3,
  stepMs = 800,
  goHoldMs = 600,
}: CountdownProps) {
  if (value !== undefined) {
    return <CountdownFrame value={value} />;
  }
  return (
    <AutoCountdown
      onComplete={onComplete}
      startAt={startAt}
      stepMs={stepMs}
      goHoldMs={goHoldMs}
    />
  );
}

function AutoCountdown({
  onComplete,
  startAt,
  stepMs,
  goHoldMs,
}: {
  onComplete?: () => void;
  startAt: number;
  stepMs: number;
  goHoldMs: number;
}) {
  const [value, setValue] = useState<CountdownValue>(startAt);

  useEffect(() => {
    if (value === null) return;
    if (value === 'GO!') {
      if (!onComplete) return;
      const t = setTimeout(onComplete, goHoldMs);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setValue((v) => (typeof v === 'number' && v > 1 ? v - 1 : 'GO!'));
    }, stepMs);
    return () => clearTimeout(t);
  }, [value, onComplete, stepMs, goHoldMs]);

  return <CountdownFrame value={value} />;
}

function CountdownFrame({ value }: { value: CountdownValue }) {
  return (
    <AnimatePresence>
      {value !== null && (
        <motion.div
          key="countdown-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-page/95"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={String(value)}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
                duration: 0.4,
              }}
              className={`font-serif font-black tabular-nums tracking-tight select-none text-9xl md:text-[180px] leading-none ${
                value === 'GO!' ? 'text-accent drop-shadow-[0_0_40px_var(--accent-glow)]' : 'text-ink'
              }`}
            >
              {value}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
