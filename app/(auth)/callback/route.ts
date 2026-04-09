import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { getValidRedirect } from '@/lib/auth/redirect';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // Determine redirect destination from cookie or URL param
  let next = getValidRedirect(searchParams.get('next'));
  if (next === '/dashboard') {
    const oauthCookie = request.cookies.get('ma-oauth-redirect')?.value;
    if (oauthCookie) {
      next = getValidRedirect(decodeURIComponent(oauthCookie));
    }
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';
  const baseUrl = isLocalEnv
    ? origin
    : forwardedHost
      ? `https://${forwardedHost}`
      : origin;

  if (code) {
    // Create the redirect response FIRST, then bind the Supabase client's
    // cookie setter to it so session tokens land on the redirect response.
    const response = NextResponse.redirect(`${baseUrl}${next}`);
    response.cookies.set('ma-oauth-redirect', '', { path: '/', maxAge: 0 });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Mark OAuth users as email verified (best-effort)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const { createAdminClient } = await import('@/lib/supabase/admin');
          const admin = createAdminClient();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (admin as any).from('profiles').update({ email_verified: true }).eq('id', user.id);
        } catch {}
      }

      return response;
    }

    // Exchange failed — log for diagnostics and redirect to login with redirect preserved
    console.error('OAuth exchange error:', error.message);
  }

  // Error path: preserve the intended redirect so the user can retry
  const loginUrl = new URL('/login', baseUrl);
  if (next !== '/dashboard') {
    loginUrl.searchParams.set('redirect', next);
  }
  // Do NOT clear the ma-oauth-redirect cookie — retry needs it
  return NextResponse.redirect(loginUrl.toString());
}
