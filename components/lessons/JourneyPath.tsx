'use client';

import type { InteractiveLesson } from '@/types';
import type { LessonState } from '@/hooks/useLessonProgress';
import { LessonNode } from './LessonNode';

interface JourneyPathProps {
  lessons: InteractiveLesson[];
  getState: (slug: string) => LessonState;
}

export function JourneyPath({ lessons, getState }: JourneyPathProps) {
  // Group lessons by category for section headers
  let lastCategory = '';

  return (
    <div className="relative max-w-xl mx-auto">
      {/* Vertical connector line */}
      <div className="absolute left-7 top-0 bottom-0 w-px bg-edge" />

      <div className="space-y-2">
        {lessons.map((lesson, i) => {
          const showCategory = lesson.category !== lastCategory;
          lastCategory = lesson.category;

          return (
            <div key={lesson.slug}>
              {showCategory && (
                <div className="relative pl-20 py-4">
                  {/* Category dot on the line */}
                  <div className="absolute left-[23px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-edge border-2 border-page" />
                  <span className="text-[11px] tracking-[2px] text-ink-muted uppercase">
                    {lesson.category}
                  </span>
                </div>
              )}
              <div className="relative pl-20 py-3">
                {/* Connector dot */}
                <div className={`absolute left-[25px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${
                  getState(lesson.slug) === 'completed' ? 'bg-accent' :
                  getState(lesson.slug) === 'available' ? 'bg-accent' : 'bg-edge'
                }`} />
                <LessonNode lesson={lesson} state={getState(lesson.slug)} index={i} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
