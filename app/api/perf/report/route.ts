import { NextRequest, NextResponse } from 'next/server';
import { checkPerfAuth } from '@/lib/perf/gate';
import { timeAsync } from '@/lib/perf/timing';

async function fetchJson(url: string, cookie: string) {
  const res = await fetch(url, { headers: { cookie }, cache: 'no-store' });
  if (!res.ok) return { error: res.status };
  return res.json();
}

export async function GET(request: NextRequest) {
  const denied = checkPerfAuth(request);
  if (denied) return denied;

  const origin = request.nextUrl.origin;
  const key = request.nextUrl.searchParams.get('key') ?? '';
  const qs = key ? `?key=${key}` : '';
  const cookie = request.headers.get('cookie') ?? '';

  // ── Run all diagnostic routes ──

  // Ping twice to detect cold vs warm
  const ping1 = await timeAsync('ping_1', () =>
    fetchJson(`${origin}/api/perf/ping${qs}`, cookie)
  );
  const ping2 = await timeAsync('ping_2', () =>
    fetchJson(`${origin}/api/perf/ping${qs}`, cookie)
  );

  // Run remaining tests in parallel (they're independent)
  const [supabaseTest, authTest, middlewareTest, dashboardTest] =
    await Promise.all([
      timeAsync('supabase_latency', () =>
        fetchJson(`${origin}/api/perf/supabase${qs}`, cookie)
      ),
      timeAsync('auth_overhead', () =>
        fetchJson(`${origin}/api/perf/auth${qs}`, cookie)
      ),
      timeAsync('middleware_cost', () =>
        fetchJson(`${origin}/api/perf/middleware-cost${qs}`, cookie)
      ),
      timeAsync('dashboard_waterfall', () =>
        fetchJson(`${origin}/api/perf/dashboard${qs}`, cookie)
      ),
    ]);

  // ── Extract key metrics ──

  const sb = supabaseTest.result as Record<string, unknown>;
  const auth = authTest.result as Record<string, unknown>;
  const mw = middlewareTest.result as Record<string, unknown>;
  const dash = dashboardTest.result as {
    sequential?: { total_ms: number; direct_supabase_ms: number; internal_api_ms: number };
    parallel?: { total_ms: number };
    savings_pct?: number;
  };

  const vercelWarmMs = (ping2.result as { ms?: number })?.ms ?? 0;
  const supabaseAvgMs = (sb.avg_query_ms as number) ?? 0;
  const authNetworkMs = (auth.network_overhead_ms as number) ?? 0;
  const middlewareTotalMs = (mw.total_middleware_ms as number) ?? 0;
  const dashSeqMs = dash.sequential?.total_ms ?? 0;
  const dashParMs = dash.parallel?.total_ms ?? 0;
  const dashDirectMs = dash.sequential?.direct_supabase_ms ?? 0;
  const dashApiMs = dash.sequential?.internal_api_ms ?? 0;

  // Current page load estimate: middleware + sequential dashboard
  const currentEstimateMs = middlewareTotalMs + dashSeqMs;
  // Optimized: middleware (reduced) + parallel dashboard
  const optimizedEstimateMs = supabaseAvgMs + dashParMs; // single query for auth vs full middleware

  // ── Diagnosis: attribute latency to layers ──

  const total = currentEstimateMs || 1;
  const layers = {
    middleware_auth: {
      ms: middlewareTotalMs,
      pct: Math.round((middlewareTotalMs / total) * 100),
      description: `Two sequential Supabase calls on every page navigation`,
    },
    dashboard_direct_queries: {
      ms: dashDirectMs,
      pct: Math.round((dashDirectMs / total) * 100),
      description: `${5} direct Supabase queries run sequentially`,
    },
    dashboard_internal_apis: {
      ms: dashApiMs,
      pct: Math.round((dashApiMs / total) * 100),
      description: `Internal API calls that each re-trigger full middleware`,
    },
    supabase_base_latency: {
      ms: supabaseAvgMs,
      pct: Math.round((supabaseAvgMs / total) * 100),
      description: `Average per-query round-trip to Supabase`,
    },
    vercel_function: {
      ms: vercelWarmMs,
      pct: Math.round((vercelWarmMs / total) * 100),
      description: `Serverless function overhead (warm)`,
    },
  };

  // Ranked recommendations
  const recommendations = [];

  if (dashSeqMs - dashParMs > 200) {
    recommendations.push({
      impact: 'high',
      saving_ms: Math.round(dashSeqMs - dashParMs),
      action: 'Parallelize dashboard queries with Promise.all()',
      detail: `Sequential: ${Math.round(dashSeqMs)}ms → Parallel: ${Math.round(dashParMs)}ms (${dash.savings_pct}% faster)`,
    });
  }

  if (dashApiMs > 300) {
    recommendations.push({
      impact: 'high',
      saving_ms: Math.round(dashApiMs * 0.6),
      action: 'Replace internal fetch() calls with direct Supabase queries',
      detail: `Internal API calls add ${Math.round(dashApiMs)}ms because each one re-runs middleware auth. Direct queries skip this overhead.`,
    });
  }

  if (middlewareTotalMs > 150) {
    recommendations.push({
      impact: 'high',
      saving_ms: Math.round(middlewareTotalMs - supabaseAvgMs),
      action: 'Replace auth.getUser() with auth.getSession() in middleware',
      detail: `getUser() costs ${Math.round(authNetworkMs)}ms extra (network call). getSession() does local JWT decode. Cache onboarding status in the JWT claims or cookie.`,
    });
  }

  if (supabaseAvgMs > 100) {
    recommendations.push({
      impact: 'medium',
      saving_ms: null,
      action: 'Check Supabase region alignment with Vercel',
      detail: `Average query latency is ${Math.round(supabaseAvgMs)}ms. If Supabase and Vercel are in different regions, this adds unnecessary latency.`,
    });
  }

  recommendations.push({
    impact: 'medium',
    saving_ms: null,
    action: 'Remove force-dynamic from app layout for cacheable pages',
    detail: `Currently ALL app pages are force-dynamic. Leaderboard, lessons, and profile pages could use ISR with revalidation.`,
  });

  recommendations.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.impact as keyof typeof order] ?? 2) - (order[b.impact as keyof typeof order] ?? 2);
  });

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    current_page_load_estimate_ms: Math.round(currentEstimateMs),
    optimized_estimate_ms: Math.round(optimizedEstimateMs),
    potential_improvement_pct: Math.round(
      ((currentEstimateMs - optimizedEstimateMs) / currentEstimateMs) * 100
    ),
    layers,
    recommendations,
    raw: {
      ping: { first: ping1.result, second: ping2.result, cold_start_detected: (ping1.result as { cold?: boolean })?.cold },
      supabase: sb,
      auth: auth,
      middleware: mw,
      dashboard: dash,
    },
  });
}
