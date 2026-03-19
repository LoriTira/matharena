import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { generatePracticeProblems } from '@/lib/problems/generator';
import type { Operation } from '@/types';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation') as Operation | null;
    const difficulty = parseInt(searchParams.get('difficulty') ?? '1', 10);
    const count = parseInt(searchParams.get('count') ?? '1', 10);

    if (!operation || !['+', '-', '*', '/'].includes(operation)) {
      return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    }

    if (difficulty < 1 || difficulty > 5) {
      return NextResponse.json({ error: 'Difficulty must be 1-5' }, { status: 400 });
    }

    const problems = generatePracticeProblems(operation, Math.min(difficulty, 5), Math.min(count, 20));

    return NextResponse.json({ problems });
  } catch (error) {
    console.error('Practice problem error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
