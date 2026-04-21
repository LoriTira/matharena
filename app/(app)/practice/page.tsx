'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { usePracticeSession } from '@/hooks/usePracticeSession';
import { PracticeSetup } from '@/components/practice/PracticeSetup';
import { PracticeGame } from '@/components/practice/PracticeGame';
import { PracticeResults } from '@/components/practice/PracticeResults';
import { Countdown } from '@/components/arcade/Countdown';
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
        <PracticeCountdown key="countdown" />
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

function PracticeCountdown() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < COUNTDOWN_SEQUENCE.length - 1) {
      const timeout = setTimeout(() => setIndex((i) => i + 1), 800);
      return () => clearTimeout(timeout);
    }
  }, [index]);

  return <Countdown value={COUNTDOWN_SEQUENCE[index]} fixed />;
}
