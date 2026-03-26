'use client';

import { useState, useCallback } from 'react';
import type { InteractiveLesson } from '@/types';

export type LessonStatus = 'playing' | 'completed' | 'failed';

interface UseLessonReturn {
  currentStepIndex: number;
  hearts: number;
  status: LessonStatus;
  xpEarned: number;
  advance: () => void;
  handleCorrect: () => void;
  handleWrong: () => void;
  retry: () => void;
}

export function useLesson(lesson: InteractiveLesson): UseLessonReturn {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [status, setStatus] = useState<LessonStatus>('playing');

  const totalSteps = lesson.steps.length;

  const checkCompletion = useCallback((nextIndex: number, currentHearts: number) => {
    if (nextIndex >= totalSteps) {
      const isPerfect = currentHearts === 3;
      const xp = lesson.xpReward + (isPerfect ? lesson.perfectBonus : 0);

      // Post completion to API (server computes XP from heartsRemaining)
      fetch('/api/lessons/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonSlug: lesson.slug,
          heartsRemaining: currentHearts,
        }),
      }).catch(() => {
        // Silently fail - completion screen still shows
      });

      setStatus('completed');
      return true;
    }
    return false;
  }, [totalSteps, lesson.xpReward, lesson.perfectBonus, lesson.slug]);

  const advance = useCallback(() => {
    if (status !== 'playing') return;
    const next = currentStepIndex + 1;
    if (!checkCompletion(next, hearts)) {
      setCurrentStepIndex(next);
    }
  }, [currentStepIndex, hearts, status, checkCompletion]);

  const handleCorrect = useCallback(() => {
    if (status !== 'playing') return;
    const next = currentStepIndex + 1;
    if (!checkCompletion(next, hearts)) {
      setCurrentStepIndex(next);
    }
  }, [currentStepIndex, hearts, status, checkCompletion]);

  const handleWrong = useCallback(() => {
    if (status !== 'playing') return;
    const newHearts = hearts - 1;
    setHearts(newHearts);
    if (newHearts <= 0) {
      setStatus('failed');
    }
  }, [hearts, status]);

  const retry = useCallback(() => {
    setCurrentStepIndex(0);
    setHearts(3);
    setStatus('playing');
  }, []);

  const isPerfect = hearts === 3;
  const xpEarned = status === 'completed'
    ? lesson.xpReward + (isPerfect ? lesson.perfectBonus : 0)
    : 0;

  return {
    currentStepIndex,
    hearts,
    status,
    xpEarned,
    advance,
    handleCorrect,
    handleWrong,
    retry,
  };
}
