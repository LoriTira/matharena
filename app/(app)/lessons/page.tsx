'use client';

import Link from 'next/link';
import { LESSONS } from '@/lib/lessons';
import { useLessonProgress } from '@/hooks/useLessonProgress';
import { Panel } from '@/components/arcade/Panel';
import { Btn } from '@/components/arcade/Btn';
import { Tag } from '@/components/arcade/Tag';
import { Bar } from '@/components/arcade/Bar';
import { Skeleton } from '@/components/ui/Skeleton';

const LESSON_ACCENT = ['lime', 'cyan', 'magenta', 'gold', 'coral', 'lime'] as const;

const COLOR_CLASSES = {
  lime:    { text: 'text-lime',    border: 'border-lime',    bgGlow: 'rgba(166,255,77,0.10)' },
  cyan:    { text: 'text-cyan',    border: 'border-cyan',    bgGlow: 'rgba(54,228,255,0.10)' },
  magenta: { text: 'text-magenta', border: 'border-magenta', bgGlow: 'rgba(255,42,127,0.10)' },
  gold:    { text: 'text-gold',    border: 'border-gold',    bgGlow: 'rgba(255,210,63,0.10)' },
  coral:   { text: 'text-coral',   border: 'border-coral',   bgGlow: 'rgba(255,139,61,0.10)' },
} as const;

export default function LessonsPage() {
  const { progress, totalXp, loading, getState } = useLessonProgress();

  const completedCount = progress.length;
  const totalCount = LESSONS.length;

  // Find the next available lesson for the preview panel
  const currentLesson =
    LESSONS.find((l) => getState(l.slug) === 'available') ??
    LESSONS.find((l) => getState(l.slug) !== 'completed') ??
    LESSONS[0];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-80" />
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-[14px]">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-20" />))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-[14px]">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap mb-2">
        <div>
          <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[2px] mb-[8px]">
            / Tricks of the trade
          </div>
          <h1 className="font-display font-extrabold text-[30px] md:text-[52px] tracking-[-1.2px] leading-[1.02]">
            The <span className="text-cyan italic">shortcuts</span> that win matches.
          </h1>
        </div>
        <div className="flex gap-[10px] font-mono text-[11px] text-ink-tertiary tracking-[1.2px] uppercase">
          <span><span className="text-cyan font-bold">{completedCount}</span> / {totalCount} done</span>
          <span className="text-ink-faint">·</span>
          <span><span className="text-gold font-bold">{totalXp}</span> XP</span>
        </div>
      </div>

      {/* Path ladder + preview */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-[14px]">
        {/* Path ladder */}
        <div className="flex flex-col gap-[8px]">
          {LESSONS.map((lesson, i) => {
            const state = getState(lesson.slug);
            const colorKey = LESSON_ACCENT[i % LESSON_ACCENT.length];
            const cls = COLOR_CLASSES[colorKey];
            const isLocked = state === 'locked';
            const isDone = state === 'completed';
            const isCurrent = state === 'available' && lesson.slug === currentLesson?.slug;
            const no = (i + 1).toString().padStart(2, '0');

            const content = (
              <div
                className={`flex items-center gap-[14px] p-[14px] md:p-[18px] border transition-colors ${
                  isLocked
                    ? 'opacity-50 border-edge-strong bg-panel'
                    : isCurrent
                      ? `${cls.border}`
                      : 'border-edge-strong bg-panel hover:border-ink'
                }`}
                style={{
                  background: isCurrent ? cls.bgGlow : undefined,
                  boxShadow: isCurrent ? `0 0 18px ${colorKey === 'lime' ? 'rgba(166,255,77,0.22)' : colorKey === 'cyan' ? 'rgba(54,228,255,0.22)' : colorKey === 'magenta' ? 'rgba(255,42,127,0.22)' : 'rgba(255,210,63,0.22)'}` : 'none',
                }}
              >
                <div
                  className="w-[44px] h-[44px] grid place-items-center font-mono font-bold text-[11px] tracking-[1.2px] shrink-0"
                  style={{
                    background: isDone ? `var(--neon-${colorKey})` : 'transparent',
                    border: `1px solid ${isDone || isCurrent ? `var(--neon-${colorKey})` : 'var(--border-strong)'}`,
                    color: isDone ? '#0a0612' : `var(--neon-${colorKey})`,
                  }}
                >
                  {isDone ? '✓' : isLocked ? '⊘' : no}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-[14px] md:text-[16px] tracking-[-0.2px] text-ink truncate">
                    {lesson.title}
                  </div>
                  <div className="font-mono text-[10px] text-ink-tertiary uppercase tracking-[1.2px] mt-[3px]">
                    {isDone ? 'Completed' : isLocked ? 'Locked' : `${lesson.steps.length} steps`}
                  </div>
                  {isCurrent && (
                    <div className="mt-[8px]">
                      <Bar progress={0} color={colorKey} height={5} />
                    </div>
                  )}
                </div>
                {isCurrent && <Btn size="sm" variant="primary">Continue</Btn>}
              </div>
            );

            if (isLocked) return <div key={lesson.slug}>{content}</div>;
            return (
              <Link key={lesson.slug} href={`/lessons/${lesson.slug}`}>
                {content}
              </Link>
            );
          })}
        </div>

        {/* Preview card */}
        {currentLesson && (
          <Panel padding={0} className="overflow-hidden">
            <div
              className="px-[20px] md:px-[28px] py-[20px] md:py-[28px] border-b border-edge"
              style={{
                background: 'linear-gradient(135deg, rgba(54,228,255,0.13), transparent 70%)',
              }}
            >
              <Tag color="cyan">
                Lesson {LESSONS.findIndex((l) => l.slug === currentLesson.slug) + 1} / {LESSONS.length} · {currentLesson.category}
              </Tag>
              <h2 className="font-display font-extrabold text-[24px] md:text-[34px] tracking-[-0.8px] leading-[1.05] mt-[12px] text-ink">
                <span className="mr-[8px]">{currentLesson.emoji}</span>
                {currentLesson.title}
              </h2>
              <div className="font-mono text-[11px] text-ink-tertiary tracking-[0.3px] mt-[8px]">
                {currentLesson.steps.length} step{currentLesson.steps.length === 1 ? '' : 's'} · +{currentLesson.xpReward} XP
              </div>
            </div>
            <div className="px-[20px] md:px-[28px] py-[20px] md:py-[28px]">
              <div className="font-display text-[15px] md:text-[17px] leading-[1.6] text-ink mb-[18px]">
                {currentLesson.description}
              </div>

              <div className="flex gap-[10px] mt-[18px] flex-wrap">
                <Link href={`/lessons/${currentLesson.slug}`} className="flex-1">
                  <Btn size="md" variant="primary" full>
                    {getState(currentLesson.slug) === 'completed' ? 'Review →' : 'Start lesson →'}
                  </Btn>
                </Link>
                <Btn size="md" variant="ghost">Skip</Btn>
              </div>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
