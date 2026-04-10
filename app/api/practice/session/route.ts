import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const saveSchema = z.object({
  duration: z.union([z.literal(60), z.literal(120), z.literal(300)]),
  operations: z.array(z.enum(['+', '-', '*', '/'])).min(1),
  config: z.object({
    operations: z.array(z.enum(['+', '-', '*', '/'])),
    duration: z.union([z.literal(60), z.literal(120), z.literal(300)]),
    difficulty: z.enum(['beginner', 'standard', 'hard', 'expert']),
    customRanges: z.record(z.string(), z.object({
      min1: z.number().int().min(1),
      max1: z.number().int().min(1),
      min2: z.number().int().min(1),
      max2: z.number().int().min(1),
    })).optional(),
  }),
  score: z.number().int().min(0),
  correctCount: z.number().int().min(0),
  wrongCount: z.number().int().min(0),
  bestStreak: z.number().int().min(0),
  operationBreakdown: z.record(z.string(), z.object({
    correct: z.number().int().min(0),
    wrong: z.number().int().min(0),
  })),
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    let query = supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    const durationFilter = searchParams.get('duration');
    if (durationFilter) {
      query = query.eq('duration', parseInt(durationFilter));
    }

    const { data: sessions, error } = await query;
    if (error) {
      console.error('Practice sessions fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    // Query actual personal best (not limited to returned sessions)
    let bestQuery = supabase
      .from('practice_sessions')
      .select('score')
      .eq('user_id', user.id);

    if (durationFilter) {
      bestQuery = bestQuery.eq('duration', parseInt(durationFilter));
    }

    const { data: bestData } = await bestQuery
      .order('score', { ascending: false })
      .limit(1)
      .single();

    const personalBest = bestData?.score ?? null;

    return NextResponse.json({ sessions: sessions || [], personalBest });
  } catch (error) {
    console.error('Practice session GET error:', error);
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
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    const { duration, operations, config, score, correctCount, wrongCount, bestStreak, operationBreakdown } = parsed.data;

    // Query the prior best BEFORE inserting. This is the authoritative
    // snapshot used to decide whether this run is a new PB.
    const { data: prevBestData } = await supabase
      .from('practice_sessions')
      .select('score')
      .eq('user_id', user.id)
      .eq('duration', duration)
      .order('score', { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousBest: number | null = prevBestData?.score ?? null;

    const { data: inserted, error: insertError } = await supabase
      .from('practice_sessions')
      .insert({
        user_id: user.id,
        duration,
        operations,
        config,
        score,
        correct_count: correctCount,
        wrong_count: wrongCount,
        best_streak: bestStreak,
        operation_breakdown: operationBreakdown,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Practice session insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
    }

    const isNewPB = previousBest === null || score > previousBest;
    const personalBest = isNewPB ? score : previousBest;

    return NextResponse.json({
      session: inserted,
      previousBest,
      personalBest,
      isNewPB,
    });
  } catch (error) {
    console.error('Practice session POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
