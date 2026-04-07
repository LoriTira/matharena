import { NextResponse } from 'next/server';
import { createVerificationToken } from '@/lib/auth/verification';
import { sendVerificationEmail } from '@/lib/email';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, password, username } = parsed.data;

    // Use admin client to create user with email auto-confirmed
    // so they can sign in immediately
    let createAdminClient: typeof import('@/lib/supabase/admin').createAdminClient;
    try {
      ({ createAdminClient } = await import('@/lib/supabase/admin'));
    } catch {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const admin = createAdminClient();

    // Check for duplicate username first
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }

    // Create user with email_confirm: true so they can sign in immediately
    const { data: userData, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        display_name: username,
      },
    });

    if (createError) {
      // Handle duplicate email
      if (createError.message?.includes('already been registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }
      console.error('Admin createUser error:', createError);
      return NextResponse.json(
        { error: createError.message || 'Failed to create account' },
        { status: 500 }
      );
    }

    // Send verification email (non-blocking — don't fail signup if email fails)
    const origin = request.headers.get('origin') || '';
    const token = createVerificationToken(userData.user.id);
    const verifyUrl = `${origin}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

    sendVerificationEmail({ to: email, username, verifyUrl }).catch((e) =>
      console.error('Verification email failed:', e)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
