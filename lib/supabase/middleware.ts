import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getValidRedirect } from '@/lib/auth/redirect';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getSession() (local JWT decode, ~2ms) instead of getUser() (network call, ~140ms)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  // Redirect unauthenticated users to login for protected routes
  const protectedPaths = ['/dashboard', '/play', '/practice', '/lessons', '/profile', '/daily', '/onboarding'];
  // Auth-required sub-routes under /challenge/[code] (landing page /challenge/[code] stays public)
  const protectedChallengePattern = /^\/challenge\/[^/]+\/lobby(?:\/|$)/;
  const isProtected =
    protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path)) ||
    protectedChallengePattern.test(request.nextUrl.pathname);

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    const originalPath = request.nextUrl.pathname + request.nextUrl.search;
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('redirect', originalPath);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  const authPaths = ['/login', '/signup'];
  const isAuthPage = authPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  if (user && isAuthPage) {
    const destination = getValidRedirect(request.nextUrl.searchParams.get('redirect'));
    const url = request.nextUrl.clone();
    url.pathname = destination;
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Onboarding guard: redirect users who haven't completed onboarding
  const isOnboardingPage = request.nextUrl.pathname.startsWith('/onboarding');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  if (user && !isAuthPage && !isApiRoute) {
    // Check cached onboarding cookie first to avoid DB query on every navigation
    const onboardedCookie = request.cookies.get('ma-onboarded')?.value;

    if (onboardedCookie === '1') {
      // Already onboarded — redirect away from onboarding page if needed
      if (isOnboardingPage) {
        const destination = getValidRedirect(request.nextUrl.searchParams.get('redirect'));
        const url = request.nextUrl.clone();
        url.pathname = destination;
        url.search = '';
        return NextResponse.redirect(url);
      }
    } else {
      // No cookie — query DB and cache result
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      if (profile?.onboarding_completed) {
        // Set cookie so we skip this query on future navigations
        supabaseResponse.cookies.set('ma-onboarded', '1', {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        if (isOnboardingPage) {
          const destination = getValidRedirect(request.nextUrl.searchParams.get('redirect'));
          const url = request.nextUrl.clone();
          url.pathname = destination;
          url.search = '';
          const redirect = NextResponse.redirect(url);
          redirect.cookies.set('ma-onboarded', '1', {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30,
          });
          return redirect;
        }
      } else if (profile && !profile.onboarding_completed && !isOnboardingPage) {
        const originalPath = request.nextUrl.pathname + request.nextUrl.search;
        const url = request.nextUrl.clone();
        url.pathname = '/onboarding';
        url.search = '';
        url.searchParams.set('redirect', originalPath);
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
