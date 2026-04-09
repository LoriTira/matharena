import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { getValidRedirect } from '@/lib/auth/redirect';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  let next = getValidRedirect(searchParams.get('next'));

  // Cookie fallback: OAuth multi-hop can lose the ?next= query param
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
    // Create the redirect response FIRST, then create the Supabase client
    // with this response's cookie setter so session cookies land on the redirect
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
      // Google OAuth users have verified emails — mark them as such
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const admin = createAdminClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any).from('profiles').update({ email_verified: true }).eq('id', user.id);
      }

      return response;
    }
  }

  // Error: redirect to login WITH the intended destination so the user
  // doesn't lose it on retry. Do NOT clear the oauth-redirect cookie —
  // the next attempt needs it.
  const loginUrl = new URL('/login', baseUrl);
  if (next !== '/dashboard') {
    loginUrl.searchParams.set('redirect', next);
  }
  return NextResponse.redirect(loginUrl.toString());
}
