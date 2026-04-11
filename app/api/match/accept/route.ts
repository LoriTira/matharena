import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { GAME_CONFIG } from '@/lib/constants';

const acceptSchema = z.object({
  matchId: z.string().uuid(),
});

/**
 * POST /api/match/accept
 *
 * Called by each client when they tap ACCEPT on the MatchFoundModal.
 * Marks the caller as accepted; if both players have now accepted, flips the
 * match to `active` and schedules `started_at` a few seconds in the future so
 * both clients can render the 3-2-1 countdown in sync.
 *
 * Contract:
 *   - Caller must be player1 or player2 of the target match.
 *   - Match must currently be in `pending_accept` state.
 *   - If caller is the second to accept, the response includes the updated
 *     match row with status='active' and started_at set.
 *   - If caller is the first to accept, response is status='pending_accept'
 *     with only caller's accepted_at populated.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = acceptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { matchId } = parsed.data;

    // Fetch the match — use a fresh read so we see the other player's
    // accepted_at if they accepted slightly before us.
    const { data: match, error: fetchError } = await supabase
      .from('matches')
      .select('*')
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

    // Already past the pending_accept step? Return current state.
    if (match.status === 'active') {
      return NextResponse.json({
        matchId: match.id,
        status: 'active',
        started_at: match.started_at,
      });
    }

    if (match.status !== 'pending_accept') {
      return NextResponse.json(
        { error: `Cannot accept a ${match.status} match` },
        { status: 409 }
      );
    }

    // Guard against abandoned-during-flight: pending_accept matches older than
    // MATCH_PENDING_STALE_MS are no longer valid.
    const age = Date.now() - new Date(match.created_at).getTime();
    if (age > GAME_CONFIG.MATCH_PENDING_STALE_MS * 2) {
      // Double the window so we don't race a legitimate 10s accept.
      return NextResponse.json(
        { error: 'Match offer expired' },
        { status: 410 }
      );
    }

    const now = new Date().toISOString();
    const otherAcceptedAt = isPlayer1
      ? match.player2_accepted_at
      : match.player1_accepted_at;

    // If the other player has already accepted, this accept should flip the
    // match to 'active' in a single atomic update. Otherwise, just record our
    // accepted_at and stay in pending_accept.
    if (otherAcceptedAt) {
      const startedAt = new Date(
        Date.now() + GAME_CONFIG.MATCH_ACCEPT_START_BUFFER_MS
      ).toISOString();

      const updates: Record<string, unknown> = {
        status: 'active',
        started_at: startedAt,
      };
      if (isPlayer1) updates.player1_accepted_at = now;
      else updates.player2_accepted_at = now;

      // Atomic flip — the eq('status', 'pending_accept') prevents double-flips
      // from racing with a simultaneous accept from the other side.
      const { data: activated, error: activateError } = await supabase
        .from('matches')
        .update(updates)
        .eq('id', matchId)
        .eq('status', 'pending_accept')
        .select('*')
        .maybeSingle();

      if (activateError) {
        console.error('Match accept activate error:', activateError);
        return NextResponse.json(
          { error: 'Failed to activate match' },
          { status: 500 }
        );
      }

      if (!activated) {
        // Race: the status already changed (e.g. the other client's accept
        // happened between our fetch and our update). Re-fetch and return.
        const { data: fresh } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .maybeSingle();

        if (fresh) {
          return NextResponse.json({
            matchId: fresh.id,
            status: fresh.status,
            started_at: fresh.started_at,
          });
        }

        return NextResponse.json(
          { error: 'Match state changed during accept' },
          { status: 409 }
        );
      }

      return NextResponse.json({
        matchId: activated.id,
        status: 'active',
        started_at: activated.started_at,
      });
    }

    // Just record our acceptance — still waiting on the other side.
    const updates: Record<string, unknown> = {};
    if (isPlayer1) updates.player1_accepted_at = now;
    else updates.player2_accepted_at = now;

    const { error: updateError } = await supabase
      .from('matches')
      .update(updates)
      .eq('id', matchId)
      .eq('status', 'pending_accept');

    if (updateError) {
      console.error('Match accept record error:', updateError);
      return NextResponse.json(
        { error: 'Failed to record accept' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      matchId,
      status: 'pending_accept',
      accepted: true,
    });
  } catch (error) {
    console.error('Match accept error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
