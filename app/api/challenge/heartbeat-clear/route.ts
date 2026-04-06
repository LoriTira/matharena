import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Minimal endpoint for clearing heartbeat timestamps.
 * Called via navigator.sendBeacon on page unload for reliable cleanup.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { challengeId, column } = body;

    if (!challengeId || (column !== 'sender_ready_at' && column !== 'recipient_ready_at')) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Verify caller is a participant before clearing
    const { data: challenge } = await supabase
      .from('challenges')
      .select('sender_id, recipient_id')
      .eq('id', challengeId)
      .single();

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    const isSender = challenge.sender_id === user.id;
    const isRecipient = challenge.recipient_id === user.id;

    if (!isSender && !isRecipient) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Only allow clearing your own heartbeat column
    if ((isSender && column !== 'sender_ready_at') || (isRecipient && column !== 'recipient_ready_at')) {
      return NextResponse.json({ error: 'Cannot clear other player\'s heartbeat' }, { status: 403 });
    }

    await supabase
      .from('challenges')
      .update({ [column]: null })
      .eq('id', challengeId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
