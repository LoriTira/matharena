import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getValidRedirect } from '@/lib/auth/redirect';

function redirectAndClearCookie(url: string) {
  const response = NextResponse.redirect(url);
  response.cookies.set('ma-oauth-redirect', '', { path: '/', maxAge: 0 });
  return response;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  let next = getValidRedirect(searchParams.get('next'));

  // Cookie fallback: OAuth multi-hop can lose the ?next= query param
  if (next === '/dashboard') {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/ma-oauth-redirect=([^;]+)/);
    if (match) {
      next = getValidRedirect(decodeURIComponent(match[1]));
    }
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (isLocalEnv) {
        return redirectAndClearCookie(`${origin}${next}`);
      } else if (forwardedHost) {
        return redirectAndClearCookie(`https://${forwardedHost}${next}`);
      } else {
        return redirectAndClearCookie(`${origin}${next}`);
      }
    }
  }

  return redirectAndClearCookie(`${origin}/login?error=auth`);
}
