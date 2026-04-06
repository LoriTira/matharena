import { NextRequest, NextResponse } from 'next/server';
import { checkPerfAuth } from '@/lib/perf/gate';
import { createClient } from '@/lib/supabase/server';
import { timeAsync } from '@/lib/perf/timing';

export async function GET(request: NextRequest) {
  const denied = checkPerfAuth(request);
  if (denied) return denied;

  const supabase = await createClient();

  // getSession() - local JWT decode, no network call
  const session = await timeAsync('auth_getSession', () =>
    supabase.auth.getSession()
  );

  // getUser() - network round-trip to Supabase Auth server
  const user = await timeAsync('auth_getUser', () =>
    supabase.auth.getUser()
  );

  // Second getUser() call to see if there's caching
  const userCached = await timeAsync('auth_getUser_repeat', () =>
    supabase.auth.getUser()
  );

  const hasSession = !!session.result.data.session;
  const hasUser = !!user.result.data.user;

  return NextResponse.json({
    authenticated: hasUser,
    getSession_ms: session.ms,
    getUser_ms: user.ms,
    getUser_repeat_ms: userCached.ms,
    network_overhead_ms:
      Math.round((user.ms - session.ms) * 100) / 100,
    note: hasSession
      ? 'getSession is local JWT decode; getUser hits Supabase Auth server'
      : 'No active session — both calls are fast but return null',
  });
}
