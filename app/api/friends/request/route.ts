import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { canonicalPair } from '@/lib/friends';
import { SOCIAL_CONFIG } from '@/lib/constants';

/**
 * POST /api/friends/request
 * Body: { targetUserId }
 *
 * Creates a pending friendship row with the current user as the requester.
 * Rate-limited to SOCIAL_CONFIG.FRIEND_REQUEST_RATE_LIMIT per rolling
 * FRIEND_REQUEST_RATE_WINDOW_MS window (enforced server-side via the admin
 * client since the rate-limit table isn't writable from a normal session).
 *
 * On PK collision (23505), returns 409 with the current relationship so the
 * client can reconcile its UI instead of silently failing.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const targetUserId: string | undefined = body.targetUserId;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });
    }
    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'Cannot friend yourself' }, { status: 400 });
    }

    // Target must exist (profiles are public-readable so we can check without admin).
    const { data: target } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', targetUserId)
      .maybeSingle();
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ─── Rate limit (admin client; RLS blocks normal writes) ───
    // Read-then-write isn't atomic, but friend requests are single-user
    // actions that don't race with themselves meaningfully. Good enough for
    // the MVP "don't let one account send 500 requests in a minute" goal.
    //
    // The admin client has no Database generic in this project, so `.from()`
    // returns `never` for both reads and writes. Matching the existing
    // `createAdminClient() as any` pattern used elsewhere in app/api/.
    type RateLimitRow = { window_start: string; count: number };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any;
    const now = Date.now();
    const rateQuery = await admin
      .from('friend_request_rate_limits')
      .select('window_start, count')
      .eq('user_id', user.id)
      .maybeSingle();
    const existing = rateQuery.data as RateLimitRow | null;

    const windowStart = existing
      ? new Date(existing.window_start).getTime()
      : 0;
    const windowExpired =
      !existing || now - windowStart > SOCIAL_CONFIG.FRIEND_REQUEST_RATE_WINDOW_MS;

    let effectiveCount: number;
    if (windowExpired) {
      await admin.from('friend_request_rate_limits').upsert({
        user_id: user.id,
        window_start: new Date(now).toISOString(),
        count: 1,
      });
      effectiveCount = 1;
    } else {
      effectiveCount = (existing?.count ?? 0) + 1;
      await admin
        .from('friend_request_rate_limits')
        .update({ count: effectiveCount })
        .eq('user_id', user.id);
    }

    if (effectiveCount > SOCIAL_CONFIG.FRIEND_REQUEST_RATE_LIMIT) {
      return NextResponse.json(
        { error: 'Too many friend requests — try again later' },
        { status: 429 },
      );
    }

    // ─── Insert the canonical row ───
    const pair = canonicalPair(user.id, targetUserId);
    const insertRow = {
      user_a: pair.user_a,
      user_b: pair.user_b,
      status: 'pending' as const,
      requested_by: user.id,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('friendships')
      .insert(insertRow)
      .select('user_a, user_b, status, requested_by, created_at, accepted_at')
      .single();

    if (insertError) {
      // 23505 = unique_violation — a row already exists for this canonical pair.
      // Return the existing row so the client can reconcile.
      if (insertError.code === '23505') {
        const { data: existing } = await supabase
          .from('friendships')
          .select('user_a, user_b, status, requested_by, created_at, accepted_at')
          .eq('user_a', pair.user_a)
          .eq('user_b', pair.user_b)
          .maybeSingle();

        return NextResponse.json(
          { error: 'Friendship already exists', friendship: existing },
          { status: 409 },
        );
      }

      console.error('Friend request insert error:', insertError);
      return NextResponse.json({ error: 'Failed to send request' }, { status: 500 });
    }

    return NextResponse.json({ friendship: inserted });
  } catch (error) {
    console.error('Friend request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
