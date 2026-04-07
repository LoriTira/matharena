import { NextResponse } from 'next/server';
import { validateVerificationToken } from '@/lib/auth/verification';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${origin}/dashboard?verify=invalid`);
  }

  const userId = validateVerificationToken(token);
  if (!userId) {
    return NextResponse.redirect(`${origin}/dashboard?verify=expired`);
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('profiles').update({ email_verified: true }).eq('id', userId);

    return NextResponse.redirect(`${origin}/dashboard?verify=success`);
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(`${origin}/dashboard?verify=error`);
  }
}
