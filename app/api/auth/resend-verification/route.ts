import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createVerificationToken } from '@/lib/auth/verification';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if already verified
    const { data: profile } = await supabase
      .from('profiles')
      .select('email_verified, username, display_name')
      .eq('id', user.id)
      .single();

    if (profile?.email_verified) {
      return NextResponse.json({ error: 'Email already verified' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || '';
    const token = createVerificationToken(user.id);
    const verifyUrl = `${origin}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    const username = profile?.display_name || profile?.username || 'there';

    await sendVerificationEmail({ to: user.email!, username, verifyUrl });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
