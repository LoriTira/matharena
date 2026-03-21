import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

function generateCode(): string {
  return crypto.randomBytes(4).toString('base64url').slice(0, 6);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const recipientId: string | undefined = body.recipientId;

    const code = generateCode();

    const insertData: Record<string, unknown> = {
      code,
      sender_id: user.id,
    };

    // Re-challenge flow: recipient is pre-filled, status is accepted
    if (recipientId) {
      if (recipientId === user.id) {
        return NextResponse.json({ error: 'Cannot challenge yourself' }, { status: 400 });
      }
      insertData.recipient_id = recipientId;
      insertData.status = 'accepted';
      insertData.accepted_at = new Date().toISOString();
    }

    const { data: challenge, error: createError } = await supabase
      .from('challenges')
      .insert(insertData)
      .select('id, code')
      .single();

    if (createError) {
      // Code collision — retry once
      if (createError.code === '23505') {
        insertData.code = generateCode();
        const { data: retry, error: retryError } = await supabase
          .from('challenges')
          .insert(insertData)
          .select('id, code')
          .single();

        if (retryError) {
          return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 });
        }

        return NextResponse.json({
          challenge: retry,
          url: `/challenge/${retry.code}`,
        });
      }

      return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 });
    }

    return NextResponse.json({
      challenge,
      url: `/challenge/${challenge.code}`,
    });
  } catch (error) {
    console.error('Challenge create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
