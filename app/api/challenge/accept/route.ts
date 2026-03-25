import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const acceptSchema = z.object({
  code: z.string().min(1),
  decline: z.boolean().optional(),
});

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

    const { code, decline } = parsed.data;

    // Look up the challenge
    const { data: challenge, error: fetchError } = await supabase
      .from('challenges')
      .select('*')
      .eq('code', code)
      .single();

    if (fetchError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    // Dismiss/decline: works on both pending and accepted challenges
    if (decline) {
      if (challenge.status !== 'pending' && challenge.status !== 'accepted') {
        return NextResponse.json({ error: 'Challenge is no longer available' }, { status: 400 });
      }
      // Only participants can dismiss
      if (challenge.sender_id !== user.id && challenge.recipient_id !== user.id) {
        return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
      }
      await supabase
        .from('challenges')
        .update({ status: 'expired' })
        .eq('id', challenge.id);
      return NextResponse.json({ success: true });
    }

    if (challenge.status !== 'pending') {
      return NextResponse.json({ error: 'Challenge is no longer available' }, { status: 400 });
    }

    // Check expiry
    if (new Date(challenge.expires_at) < new Date()) {
      await supabase
        .from('challenges')
        .update({ status: 'expired' })
        .eq('id', challenge.id);
      return NextResponse.json({ error: 'Challenge has expired' }, { status: 400 });
    }

    if (challenge.sender_id === user.id) {
      return NextResponse.json({ error: 'Cannot accept your own challenge' }, { status: 400 });
    }

    // If challenge was sent to a specific friend, only they can accept
    if (challenge.recipient_id && challenge.recipient_id !== user.id) {
      return NextResponse.json({ error: 'This challenge was sent to someone else' }, { status: 403 });
    }

    // Accept the challenge
    const { data: updated, error: updateError } = await supabase
      .from('challenges')
      .update({
        recipient_id: user.id,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', challenge.id)
      .eq('status', 'pending') // Optimistic lock
      .select('*')
      .single();

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Failed to accept challenge' }, { status: 500 });
    }

    return NextResponse.json({ challenge: updated });
  } catch (error) {
    console.error('Challenge accept error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
