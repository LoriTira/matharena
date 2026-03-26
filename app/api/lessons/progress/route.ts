import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getLessonBySlug } from '@/lib/lessons';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: progress, error } = await supabase
      .from('lesson_progress')
      .select('lesson_slug, completed_at, hearts_remaining, xp_earned')
      .eq('user_id', user.id);

    if (error) {
      console.error('Lesson progress fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
    }

    const totalXp = (progress ?? []).reduce((sum, p) => sum + p.xp_earned, 0);

    return NextResponse.json({
      progress: (progress ?? []).map((p) => ({
        lessonSlug: p.lesson_slug,
        completedAt: p.completed_at,
        heartsRemaining: p.hearts_remaining,
        xpEarned: p.xp_earned,
      })),
      totalXp,
    });
  } catch (error) {
    console.error('Lesson progress error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { lessonSlug, heartsRemaining } = body;

    if (!lessonSlug || heartsRemaining == null) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Validate lesson exists
    const lesson = getLessonBySlug(lessonSlug);
    if (!lesson) {
      return NextResponse.json({ error: 'Invalid lesson' }, { status: 400 });
    }

    // Server-side XP computation (prevents client manipulation)
    const xpEarned = lesson.xpReward + (heartsRemaining === 3 ? lesson.perfectBonus : 0);

    // Upsert lesson progress
    const { error: upsertError } = await supabase
      .from('lesson_progress')
      .upsert(
        {
          user_id: user.id,
          lesson_slug: lessonSlug,
          completed_at: new Date().toISOString(),
          hearts_remaining: heartsRemaining,
          xp_earned: xpEarned,
        },
        { onConflict: 'user_id,lesson_slug' }
      );

    if (upsertError) {
      console.error('Lesson progress upsert error:', upsertError);
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
    }

    // Recalculate total XP from all completed lessons
    const { data: allProgress } = await supabase
      .from('lesson_progress')
      .select('xp_earned')
      .eq('user_id', user.id);

    const totalXp = (allProgress ?? []).reduce((sum, p) => sum + p.xp_earned, 0);

    // Update profile total_xp
    await supabase
      .from('profiles')
      .update({ total_xp: totalXp })
      .eq('id', user.id);

    return NextResponse.json({ success: true, totalXp });
  } catch (error) {
    console.error('Lesson progress save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
