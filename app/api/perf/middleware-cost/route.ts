import { NextRequest, NextResponse } from 'next/server';
import { checkPerfAuth } from '@/lib/perf/gate';
import { createClient } from '@/lib/supabase/server';
import { timeAsync } from '@/lib/perf/timing';

export async function GET(request: NextRequest) {
  const denied = checkPerfAuth(request);
  if (denied) return denied;

  const supabase = await createClient();

  // Step 1: auth.getUser() — what middleware calls on every request
  const authStep = await timeAsync('middleware_auth_getUser', () =>
    supabase.auth.getUser()
  );

  const user = authStep.result.data.user;

  // Step 2: profiles query for onboarding_completed — middleware's second call
  let profileStep;
  if (user) {
    profileStep = await timeAsync('middleware_profile_query', async () =>
      supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()
    );
  }

  const totalMs = authStep.ms + (profileStep?.ms ?? 0);

  return NextResponse.json({
    authenticated: !!user,
    auth_getUser_ms: authStep.ms,
    profile_query_ms: profileStep?.ms ?? null,
    total_middleware_ms: Math.round(totalMs * 100) / 100,
    note: 'This runs on EVERY page navigation. Two sequential Supabase round-trips.',
    impact: `Adds ~${Math.round(totalMs)}ms to every page load before any content renders`,
  });
}
