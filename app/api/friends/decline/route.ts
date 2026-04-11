import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { canonicalPair } from '@/lib/friends';

/**
 * POST /api/friends/decline
 * Body: { otherUserId }
 *
 * Deletes a pending friendship row where the caller is the recipient (i.e.
 * NOT the original requester). RLS allows either party to delete, so the
 * handler adds an explicit `requested_by != me` filter to enforce the
 * "decline" semantics.
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
    const { error: deleteError, count } = await supabase
      .from('friendships')
      .delete({ count: 'exact' })
      .eq('user_a', pair.user_a)
      .eq('user_b', pair.user_b)
      .eq('status', 'pending')
      .neq('requested_by', user.id);

    if (deleteError) {
      console.error('Friend decline error:', deleteError);
      return NextResponse.json({ error: 'Failed to decline request' }, { status: 500 });
    }

    if (!count) {
      return NextResponse.json({ error: 'No pending request found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Friend decline error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
