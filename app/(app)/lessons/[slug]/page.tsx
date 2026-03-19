'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { Lesson } from '@/types';

interface LessonPageProps {
  params: Promise<{ slug: string }>;
}

export default function LessonPage({ params }: LessonPageProps) {
  const { slug } = use(params);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchLesson = async () => {
      const { data } = await supabase
        .from('lessons')
        .select('*')
        .eq('slug', slug)
        .single();

      if (data) setLesson(data as Lesson);
      setLoading(false);
    };

    fetchLesson();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-xl text-red-400">Lesson not found</div>
        <Link href="/lessons" className="text-blue-400 hover:text-blue-300">
          ← Back to lessons
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/lessons" className="text-blue-400 hover:text-blue-300 text-sm">
        ← Back to lessons
      </Link>

      <h1 className="text-3xl font-bold text-white mt-4">{lesson.title}</h1>

      {lesson.description && (
        <p className="text-gray-400 mt-2">{lesson.description}</p>
      )}

      <div className="mt-8 prose prose-invert max-w-none">
        {/* Simple markdown rendering — split by lines and render headers/paragraphs */}
        {lesson.content.split('\n').map((line, i) => {
          if (line.startsWith('# ')) {
            return <h1 key={i} className="text-2xl font-bold text-white mt-6 mb-3">{line.slice(2)}</h1>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={i} className="text-xl font-bold text-white mt-5 mb-2">{line.slice(3)}</h2>;
          }
          if (line.startsWith('- ')) {
            return <li key={i} className="text-gray-300 ml-4">{renderInline(line.slice(2))}</li>;
          }
          if (line.trim() === '') {
            return <br key={i} />;
          }
          return <p key={i} className="text-gray-300 leading-relaxed">{renderInline(line)}</p>;
        })}
      </div>
    </div>
  );
}

function renderInline(text: string) {
  // Bold text
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
