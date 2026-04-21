'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { usePracticeSession } from '@/hooks/usePracticeSession';
import { PracticeSetup } from '@/components/practice/PracticeSetup';
import { PracticeGame } from '@/components/practice/PracticeGame';
import { PracticeResults } from '@/components/practice/PracticeResults';
import type { PracticeConfig } from '@/types';

export default function PracticePage() {
  const searchParams = useSearchParams();
  const initialConfig = useMemo((): Partial<PracticeConfig> | undefined => {
    const sprint = searchParams.get('sprint');
    if (sprint === '120') {
      return { duration: 120, difficulty: 'standard', operations: ['+', '-', '*', '/'] };
    }
    return undefined;
  }, [searchParams]);

  const session = usePracticeSession(initialConfig);

  const autoStarted = useRef(false);

  useEffect(() => {
    if (initialConfig && session.phase === 'idle' && !autoStarted.current) {
      autoStarted.current = true;
      session.startSession();
    }
  }, [initialConfig, session.phase, session.startSession]);

  return (
    <AnimatePresence mode="wait">
      {session.phase === 'idle' && (
        <PracticeSetup
          key="setup"
          config={session.config}
          onConfigChange={session.setConfig}
          onStart={session.startSession}
          personalBest={session.personalBest}
        />
      )}

      {session.phase === 'countdown' && (
        <Countdown key="countdown" />
      )}

      {session.phase === 'playing' && (
        <PracticeGame
          key="game"
          currentProblem={session.currentProblem}
          problemCount={session.problemCount}
          stats={session.stats}
          timeRemaining={session.timeRemaining}
          totalDuration={session.totalDuration}
          onSubmitAnswer={session.submitAnswer}
        />
      )}

      {session.phase === 'finished' && (
        <PracticeResults
          key="results"
          score={session.stats.correct}
          correctCount={session.stats.correct}
          wrongCount={session.stats.wrong}
          bestStreak={session.stats.bestStreak}
          operationBreakdown={session.stats.operationBreakdown}
          isNewPersonalBest={session.isNewPersonalBest}
          previousBest={session.previousBest}
          personalBest={session.personalBest}
          sessionHistory={session.sessionHistory}
          onPlayAgain={session.replaySession}
          onSettings={session.resetToSetup}
        />
      )}
    </AnimatePresence>
  );
}

const COUNTDOWN_SEQUENCE = ['3', '2', '1', 'GO!'];

function Countdown() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < COUNTDOWN_SEQUENCE.length - 1) {
      const timeout = setTimeout(() => setIndex((i) => i + 1), 800);
      return () => clearTimeout(timeout);
    }
  }, [index]);

  return (
    <motion.div
      className="flex items-center justify-center min-h-[60vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className={`font-serif tabular-nums ${
            index === COUNTDOWN_SEQUENCE.length - 1
              ? 'text-6xl text-accent'
              : 'text-8xl text-ink'
          }`}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: [0.5, 1.15, 1], opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {COUNTDOWN_SEQUENCE[index]}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
