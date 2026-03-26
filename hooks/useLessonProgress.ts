'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { LESSONS } from '@/lib/lessons';
import type { LessonProgress } from '@/types';

export type LessonState = 'locked' | 'available' | 'completed';

interface UseLessonProgressReturn {
  progress: LessonProgress[];
  totalXp: number;
  loading: boolean;
  getState: (slug: string) => LessonState;
  refetch: () => void;
}

export function useLessonProgress(): UseLessonProgressReturn {
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch('/api/lessons/progress');
      if (res.ok) {
        const data = await res.json();
        setProgress(data.progress ?? []);
        setTotalXp(data.totalXp ?? 0);
      }
    } catch {
      // Silently fail - unauthenticated users see sequential unlock from lesson 1
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  const completedSlugs = useMemo(() => new Set(progress.map((p) => p.lessonSlug)), [progress]);

  const getState = useCallback((slug: string): LessonState => {
    if (completedSlugs.has(slug)) return 'completed';

    const lessonIndex = LESSONS.findIndex((l) => l.slug === slug);

    // First lesson is always available
    if (lessonIndex === 0) return 'available';

    // Available if the previous lesson is completed
    if (lessonIndex > 0) {
      const prevSlug = LESSONS[lessonIndex - 1].slug;
      if (completedSlugs.has(prevSlug)) return 'available';
    }

    return 'locked';
  }, [completedSlugs]);

  return {
    progress,
    totalXp,
    loading,
    getState,
    refetch: fetch_,
  };
}
