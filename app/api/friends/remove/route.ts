import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { canonicalPair } from '@/lib/friends';

/**
 * POST /api/friends/remove
 * Body: { otherUserId }
 *
 * Deletes a friendship row regardless of status — used both for un-friending
 * an accepted connection and for cancelling an outgoing pending request.
 * RLS allows either party to delete their own rows.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const otherUserId: string | undefined = body.otherUserId;

    if (!otherUserId || typeof otherUserId !== 'string') {
      return NextResponse.json({ error: 'Missing otherUserId' }, { status: 400 });
    }

    const pair = canonicalPair(user.id, otherUserId);
    const { error: deleteError } = await supabase
      .from('friendships')
      .delete()
      .eq('user_a', pair.user_a)
      .eq('user_b', pair.user_b);

    if (deleteError) {
      console.error('Friend remove error:', deleteError);
      return NextResponse.json({ error: 'Failed to remove' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Friend remove error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
