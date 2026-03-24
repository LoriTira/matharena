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
        <div className="text-white/25">Loading...</div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-white/40">Lesson not found</div>
        <Link href="/lessons" className="text-white/50 underline underline-offset-2 decoration-white/15 hover:text-white/70 text-sm">
          Back to lessons
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/lessons" className="text-white/30 underline underline-offset-2 decoration-white/10 hover:text-white/50 text-sm transition-colors">
        Back to lessons
      </Link>

      <h1 className="font-serif text-3xl font-normal text-white/90 mt-6">{lesson.title}</h1>

      {lesson.description && (
        <p className="text-white/35 mt-2 font-normal">{lesson.description}</p>
      )}

      <div className="w-10 h-px bg-white/10 my-8" />

      <div className="max-w-none">
        {lesson.content.split('\n').map((line, i) => {
          if (line.startsWith('# ')) {
            return <h1 key={i} className="font-serif text-2xl font-normal text-white/85 mt-8 mb-3">{line.slice(2)}</h1>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={i} className="font-serif text-xl font-normal text-white/75 mt-6 mb-2">{line.slice(3)}</h2>;
          }
          if (line.startsWith('- ')) {
            return <li key={i} className="text-white/50 ml-4 leading-relaxed">{renderInline(line.slice(2))}</li>;
          }
          if (line.trim() === '') {
            return <br key={i} />;
          }
          return <p key={i} className="text-white/50 leading-relaxed">{renderInline(line)}</p>;
        })}
      </div>
    </div>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white/80 font-medium">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
