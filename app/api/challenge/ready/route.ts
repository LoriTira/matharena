import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const readySchema = z.object({
  code: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = readySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { code } = parsed.data;

    // Fetch the challenge with its match
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('*')
      .eq('code', code)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    if (challenge.sender_id !== user.id && challenge.recipient_id !== user.id) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // No match created yet — first player hasn't arrived
    if (!challenge.match_id) {
      return NextResponse.json({ matchId: null, status: 'no_match' });
    }

    // Check the match status
    const { data: match } = await supabase
      .from('matches')
      .select('id, status')
      .eq('id', challenge.match_id)
      .single();

    if (!match) {
      return NextResponse.json({ matchId: null, status: 'no_match' });
    }

    // Already active or completed — just return
    if (match.status !== 'waiting') {
      return NextResponse.json({ matchId: match.id, status: match.status });
    }

    // Match is waiting — this player activates it (second player ready)
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', match.id)
      .eq('status', 'waiting');

    if (updateError) {
      return NextResponse.json({ error: 'Failed to activate match' }, { status: 500 });
    }

    return NextResponse.json({ matchId: match.id, status: 'active' });
  } catch (error) {
    console.error('Challenge ready error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
