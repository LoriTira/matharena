'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { Lesson } from '@/types';

const categoryColors: Record<string, string> = {
  addition: 'bg-green-900 text-green-300 border-green-700',
  subtraction: 'bg-red-900 text-red-300 border-red-700',
  multiplication: 'bg-blue-900 text-blue-300 border-blue-700',
  division: 'bg-purple-900 text-purple-300 border-purple-700',
};

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
        <div className="text-gray-400">Loading lessons...</div>
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Lessons</h1>
        <p className="text-gray-400 mt-2">Learn mental math tricks and techniques to improve your speed.</p>
      </div>

      {Object.entries(grouped).map(([category, categoryLessons]) => (
        <div key={category}>
          <h2 className="text-xl font-bold text-white capitalize mb-4">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryLessons.map((lesson) => (
              <Link
                key={lesson.id}
                href={`/lessons/${lesson.slug}`}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-6 transition-colors group"
              >
                <span
                  className={`inline-block px-2 py-1 text-xs font-medium rounded border ${
                    categoryColors[lesson.category] ?? 'bg-gray-800 text-gray-300 border-gray-600'
                  }`}
                >
                  {lesson.category}
                </span>
                <h3 className="text-lg font-semibold text-white mt-3 group-hover:text-blue-400 transition-colors">
                  {lesson.title}
                </h3>
                {lesson.description && (
                  <p className="text-gray-400 text-sm mt-2">{lesson.description}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
