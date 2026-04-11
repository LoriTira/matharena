import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { GAME_CONFIG } from '@/lib/constants';

const declineSchema = z.object({
  matchId: z.string().uuid(),
  reason: z.enum(['declined', 'timeout']).optional().default('declined'),
});

/**
 * POST /api/match/decline
 *
 * Called when a player taps DECLINE or when the 10s accept timer runs out.
 * - Sets the match to `abandoned` (non-destructively — we do not update Elo
 *   or award a win, since the match never actually started).
 * - Inserts a row into `search_cooldowns` with expires_at = now() + 30s for
 *   the declining user. The /api/match/find endpoint will refuse to start a
 *   new search for cooldown'd users during this window.
 *
 * Both decline and timeout get the same 30s cooldown per the approved plan
 * (discourages tab-switching / ignoring modals to cherry-pick opponents).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = declineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { matchId, reason } = parsed.data;

    const { data: match, error: fetchError } = await supabase
      .from('matches')
      .select('id, player1_id, player2_id, status')
      .eq('id', matchId)
      .maybeSingle();

    if (fetchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const isPlayer1 = match.player1_id === user.id;
    const isPlayer2 = match.player2_id === user.id;
    if (!isPlayer1 && !isPlayer2) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Only pending_accept matches can be declined via this endpoint.
    // Active/completed matches use /api/match/abandon.
    if (match.status !== 'pending_accept') {
      // Already resolved — return success idempotently so duplicate decline
      // requests (from double-clicks or retries) don't error out.
      return NextResponse.json({ success: true, alreadyResolved: true });
    }

    // Abandon the match. Use an optimistic check so concurrent accepts/declines
    // don't step on each other.
    await supabase
      .from('matches')
      .update({
        status: 'abandoned',
        completed_at: new Date().toISOString(),
      })
      .eq('id', matchId)
      .eq('status', 'pending_accept');

    // Record the cooldown. Use the admin client so the RLS SELECT-only policy
    // on search_cooldowns doesn't block this write.
    const admin = createAdminClient();
    const expiresAt = new Date(
      Date.now() + GAME_CONFIG.MATCH_DECLINE_COOLDOWN_MS
    ).toISOString();

    await (admin as unknown as typeof supabase)
      .from('search_cooldowns')
      .upsert(
        {
          user_id: user.id,
          expires_at: expiresAt,
        },
        { onConflict: 'user_id' }
      );

    return NextResponse.json({
      success: true,
      reason,
      cooldownUntil: expiresAt,
    });
  } catch (error) {
    console.error('Match decline error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
