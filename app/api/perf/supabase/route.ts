import { NextRequest, NextResponse } from 'next/server';
import { checkPerfAuth } from '@/lib/perf/gate';
import { createClient } from '@/lib/supabase/server';
import { timeAsync } from '@/lib/perf/timing';

export async function GET(request: NextRequest) {
  const denied = checkPerfAuth(request);
  if (denied) return denied;

  const supabase = await createClient();

  // 1. Simple query via Supabase JS client
  const clientQuery = await timeAsync('supabase_client_query', async () =>
    supabase.from('profiles').select('id').limit(1)
  );

  // 2. Raw REST API call (bypasses JS client overhead)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const rawRest = await timeAsync('supabase_raw_rest', () =>
    fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    }).then((r) => r.json())
  );

  // 3. Multiple sequential queries to measure consistency
  const threeQueries = await timeAsync('supabase_3x_sequential', async () => {
    const times: number[] = [];
    for (let i = 0; i < 3; i++) {
      const s = performance.now();
      await supabase.from('profiles').select('id').limit(1);
      times.push(Math.round((performance.now() - s) * 100) / 100);
    }
    return times;
  });

  return NextResponse.json({
    client_query_ms: clientQuery.ms,
    raw_rest_ms: rawRest.ms,
    sequential_3x: threeQueries.result,
    sequential_3x_total_ms: threeQueries.ms,
    avg_query_ms:
      Math.round(
        ((threeQueries.result as number[]).reduce((a, b) => a + b, 0) / 3) * 100
      ) / 100,
  });
}
