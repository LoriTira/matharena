import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { canonicalPair } from '@/lib/friends';

/**
 * POST /api/friends/accept
 * Body: { otherUserId }
 *
 * Flips a pending friendship row to 'accepted'. The RLS policy
 * "Recipient can accept" rejects the update unless the caller is NOT the
 * original requester — so the requester can't accept their own request.
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
    if (otherUserId === user.id) {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
    }

    const pair = canonicalPair(user.id, otherUserId);
    const { data: updated, error: updateError } = await supabase
      .from('friendships')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('user_a', pair.user_a)
      .eq('user_b', pair.user_b)
      .eq('status', 'pending')
      .select('user_a, user_b, status, requested_by, created_at, accepted_at')
      .maybeSingle();

    if (updateError) {
      console.error('Friend accept update error:', updateError);
      return NextResponse.json({ error: 'Failed to accept request' }, { status: 500 });
    }

    if (!updated) {
      // Either the row doesn't exist, is already accepted, or RLS rejected
      // the update (caller is the requester). Return 404 either way — the
      // client should refetch to reconcile.
      return NextResponse.json({ error: 'No pending request found' }, { status: 404 });
    }

    return NextResponse.json({ friendship: updated });
  } catch (error) {
    console.error('Friend accept error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
