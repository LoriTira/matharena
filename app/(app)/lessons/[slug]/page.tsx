'use client';

import { use } from 'react';
import Link from 'next/link';
import { getLessonBySlug } from '@/lib/lessons';
import { LessonPlayer } from '@/components/lessons/LessonPlayer';

interface LessonPageProps {
  params: Promise<{ slug: string }>;
}

export default function LessonPage({ params }: LessonPageProps) {
  const { slug } = use(params);
  const lesson = getLessonBySlug(slug);

  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-ink-muted">Lesson not found</div>
        <Link href="/lessons" className="text-ink-tertiary underline underline-offset-2 decoration-edge hover:text-ink-secondary text-sm transition-colors">
          Back to lessons
        </Link>
      </div>
    );
  }

  return <LessonPlayer lesson={lesson} />;
}
