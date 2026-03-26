import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { sendChallengeEmail } from '@/lib/email';
import crypto from 'crypto';

function generateCode(): string {
  return crypto.randomBytes(4).toString('base64url').slice(0, 6);
}

async function sendEmailNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  senderId: string,
  recipientId: string,
  challengeCode: string,
  origin: string
) {
  try {
    // Get sender profile for their display name
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', senderId)
      .single();

    const senderName = senderProfile?.display_name || senderProfile?.username || 'Someone';

    // Get recipient email via admin client
    let recipientEmail: string | null = null;
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const admin = createAdminClient();
      const { data } = await admin.auth.admin.getUserById(recipientId);
      recipientEmail = data?.user?.email ?? null;
    } catch (err) {
      console.error('Admin client error (skipping email):', err);
      return;
    }

    if (!recipientEmail) {
      console.warn('No email found for recipient:', recipientId);
      return;
    }

    const challengeUrl = `${origin}/challenge/${challengeCode}`;
    await sendChallengeEmail({
      to: recipientEmail,
      challengerName: senderName,
      challengeUrl,
    });
  } catch (e) {
    console.error('Email notification failed:', e);
  }
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
    const isRematch: boolean = body.rematch === true;

    // If rematch, check if opponent already created one for us
    if (isRematch && recipientId) {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from('challenges')
        .select('id, code')
        .eq('sender_id', recipientId)
        .eq('recipient_id', user.id)
        .eq('status', 'accepted')
        .is('match_id', null)
        .gte('created_at', fiveMinAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        return NextResponse.json({
          challenge: existing,
          url: `/challenge/${existing.code}`,
        });
      }
    }

    const code = generateCode();

    const insertData: Record<string, unknown> = {
      code,
      sender_id: user.id,
    };

    if (recipientId) {
      if (recipientId === user.id) {
        return NextResponse.json({ error: 'Cannot challenge yourself' }, { status: 400 });
      }
      insertData.recipient_id = recipientId;

      if (isRematch) {
        // Rematch from post-match screen: both players are present, auto-accept
        insertData.status = 'accepted';
        insertData.accepted_at = new Date().toISOString();
      }
      // Otherwise stays 'pending' — friend needs to accept via link/email
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

        // Send email notification for direct (non-rematch) challenges — must await in serverless
        if (recipientId && !isRematch) {
          const origin = request.headers.get('origin') || '';
          await sendEmailNotification(supabase, user.id, recipientId, retry.code, origin);
        }

        return NextResponse.json({
          challenge: retry,
          url: `/challenge/${retry.code}`,
        });
      }

      return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 });
    }

    // Send email notification for direct (non-rematch) challenges — must await in serverless
    if (recipientId && !isRematch) {
      console.log('Sending challenge email to recipient:', recipientId);
      const origin = request.headers.get('origin') || '';
      await sendEmailNotification(supabase, user.id, recipientId, challenge.code, origin);
    } else {
      console.log('Skipping email:', { recipientId: !!recipientId, isRematch });
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
