'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { Lesson } from '@/types';

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchLessons = async () => {
      const { data } = await supabase
        .from('lessons')
        .select('*')
        .order('sort_order', { ascending: true });

      if (data) setLessons(data as Lesson[]);
      setLoading(false);
    };

    fetchLessons();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-ink-muted">Loading lessons...</div>
      </div>
    );
  }

  // Group by category
  const grouped = lessons.reduce<Record<string, Lesson[]>>((acc, lesson) => {
    if (!acc[lesson.category]) acc[lesson.category] = [];
    acc[lesson.category].push(lesson);
    return acc;
  }, {});

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Lessons</h1>
        <p className="text-ink-muted mt-2 text-[15px] font-light">Learn mental math tricks and techniques to improve your speed.</p>
      </div>

      {Object.entries(grouped).map(([category, categoryLessons]) => (
        <div key={category}>
          <h2 className="font-serif text-lg text-ink-secondary capitalize mb-4">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryLessons.map((lesson) => (
              <Link
                key={lesson.id}
                href={`/lessons/${lesson.slug}`}
                className="border border-edge rounded-sm p-6 bg-card hover:border-edge-strong transition-colors group"
              >
                <span className="inline-block px-2 py-0.5 text-[9px] tracking-[1.5px] text-ink-muted border border-edge rounded-sm uppercase">
                  {lesson.category}
                </span>
                <h3 className="font-serif text-base text-ink mt-3 group-hover:text-ink transition-colors">
                  {lesson.title}
                </h3>
                {lesson.description && (
                  <p className="text-ink-muted text-sm mt-2 leading-relaxed">{lesson.description}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
