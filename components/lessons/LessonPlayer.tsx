'use client';

import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { InteractiveLesson } from '@/types';
import { useLesson } from '@/hooks/useLesson';
import { ProgressBar } from './ProgressBar';
import { HeartsDisplay } from './HeartsDisplay';
import { TeachStep } from './steps/TeachStep';
import { ExampleStep } from './steps/ExampleStep';
import { PracticeStep } from './steps/PracticeStep';
import { QuizStep } from './steps/QuizStep';
import { LessonComplete } from './LessonComplete';
import { LessonFailed } from './LessonFailed';

interface LessonPlayerProps {
  lesson: InteractiveLesson;
}

export function LessonPlayer({ lesson }: LessonPlayerProps) {
  const router = useRouter();
  const {
    currentStepIndex,
    hearts,
    status,
    xpEarned,
    advance,
    handleCorrect,
    handleWrong,
    retry,
  } = useLesson(lesson);

  const currentStep = lesson.steps[currentStepIndex];

  if (status === 'completed') {
    return (
      <div className="fixed inset-0 z-[60] bg-page overflow-y-auto">
        <LessonComplete
          lessonTitle={lesson.title}
          hearts={hearts}
          xpEarned={xpEarned}
          isPerfect={hearts === 3}
        />
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="fixed inset-0 z-[60] bg-page overflow-y-auto">
        <LessonFailed
          lessonTitle={lesson.title}
          stepsCompleted={currentStepIndex}
          totalSteps={lesson.steps.length}
          onRetry={retry}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-page flex flex-col overflow-y-auto">
      {/* Header bar */}
      <div className="flex items-center gap-4 px-4 sm:px-6 py-4 shrink-0">
        <button
          onClick={() => router.push('/lessons')}
          className="text-ink-muted hover:text-ink-secondary transition-colors"
          aria-label="Close lesson"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="flex-1">
          <ProgressBar current={currentStepIndex} total={lesson.steps.length} />
        </div>
        <HeartsDisplay hearts={hearts} />
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center py-8">
        <AnimatePresence mode="wait">
          <div key={currentStepIndex} className="w-full">
            {currentStep.type === 'teach' && (
              <TeachStep step={currentStep} onContinue={advance} />
            )}
            {currentStep.type === 'example' && (
              <ExampleStep step={currentStep} onContinue={advance} />
            )}
            {currentStep.type === 'practice' && (
              <PracticeStep
                step={currentStep}
                onCorrect={handleCorrect}
                onWrong={handleWrong}
              />
            )}
            {currentStep.type === 'quiz' && (
              <QuizStep
                step={currentStep}
                onCorrect={handleCorrect}
                onWrong={handleWrong}
              />
            )}
          </div>
        </AnimatePresence>
      </div>
    </div>
  );
}
