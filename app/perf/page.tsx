'use client';

import { useState, useCallback } from 'react';

type QueryTiming = { label: string; ms: number };
type Layer = { ms: number; pct: number; description: string };
type Recommendation = {
  impact: string;
  saving_ms: number | null;
  action: string;
  detail: string;
};

type Report = {
  timestamp: string;
  current_page_load_estimate_ms: number;
  optimized_estimate_ms: number;
  potential_improvement_pct: number;
  layers: Record<string, Layer>;
  recommendations: Recommendation[];
  raw: {
    ping: { first: unknown; second: unknown; cold_start_detected: boolean };
    supabase: Record<string, unknown>;
    auth: Record<string, unknown>;
    middleware: Record<string, unknown>;
    dashboard: {
      sequential: { total_ms: number; queries: QueryTiming[] };
      parallel: { total_ms: number; queries: QueryTiming[] };
      savings_ms: number;
      savings_pct: number;
    };
  };
};

function Bar({ ms, maxMs, label, color }: { ms: number; maxMs: number; label: string; color: string }) {
  const pct = Math.min((ms / maxMs) * 100, 100);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-48 text-right truncate text-neutral-400 font-mono text-xs">{label}</span>
      <div className="flex-1 bg-neutral-800 rounded h-5 relative overflow-hidden">
        <div
          className={`h-full rounded ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-20 text-right font-mono text-xs tabular-nums">
        {Math.round(ms)}ms
      </span>
    </div>
  );
}

function ImpactBadge({ impact }: { impact: string }) {
  const colors: Record<string, string> = {
    high: 'bg-red-900/50 text-red-300 border-red-700',
    medium: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
    low: 'bg-green-900/50 text-green-300 border-green-700',
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded border ${colors[impact] ?? colors.low}`}>
      {impact}
    </span>
  );
}

export default function PerfPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientTimingMs, setClientTimingMs] = useState<number | null>(null);

  const runDiagnostics = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    const key = new URLSearchParams(window.location.search).get('key') ?? '';
    const qs = key ? `?key=${key}` : '';

    const start = performance.now();
    try {
      const res = await fetch(`/api/perf/report${qs}`, { cache: 'no-store' });
      const elapsed = Math.round(performance.now() - start);
      setClientTimingMs(elapsed);

      if (!res.ok) {
        const body = await res.text();
        setError(`HTTP ${res.status}: ${body}`);
        return;
      }
      setReport(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const navTiming =
    typeof window !== 'undefined' && window.performance?.getEntriesByType
      ? (window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)
      : undefined;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-1">MathsArena Performance Diagnostics</h1>
      <p className="text-neutral-500 text-sm mb-8">
        Measures latency across Vercel, Supabase, middleware, and application code.
      </p>

      <button
        onClick={runDiagnostics}
        disabled={loading}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-700 disabled:text-neutral-500 rounded-lg font-medium transition-colors"
      >
        {loading ? 'Running diagnostics...' : 'Run Diagnostics'}
      </button>

      {error && (
        <div className="mt-6 p-4 bg-red-950 border border-red-800 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {report && (
        <div className="mt-8 space-y-8">
          {/* Summary */}
          <section className="p-6 bg-neutral-900 rounded-xl border border-neutral-800">
            <h2 className="text-lg font-semibold mb-4">Summary</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-3xl font-bold text-red-400 tabular-nums">
                  {report.current_page_load_estimate_ms}ms
                </div>
                <div className="text-xs text-neutral-500 mt-1">Current (middleware + dashboard)</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-400 tabular-nums">
                  {report.optimized_estimate_ms}ms
                </div>
                <div className="text-xs text-neutral-500 mt-1">Optimized estimate</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-400 tabular-nums">
                  {report.potential_improvement_pct}%
                </div>
                <div className="text-xs text-neutral-500 mt-1">Potential improvement</div>
              </div>
            </div>
            {clientTimingMs && (
              <div className="mt-4 text-xs text-neutral-500">
                Client round-trip for this report: {clientTimingMs}ms
              </div>
            )}
          </section>

          {/* Layer Attribution */}
          <section className="p-6 bg-neutral-900 rounded-xl border border-neutral-800">
            <h2 className="text-lg font-semibold mb-4">Latency Attribution</h2>
            <div className="space-y-3">
              {Object.entries(report.layers)
                .sort(([, a], [, b]) => b.ms - a.ms)
                .map(([key, layer]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-neutral-300">{key.replace(/_/g, ' ')}</span>
                      <span className="text-neutral-500">{layer.pct}%</span>
                    </div>
                    <div className="w-full bg-neutral-800 rounded h-3 overflow-hidden">
                      <div
                        className="h-full rounded bg-blue-500 transition-all"
                        style={{ width: `${layer.pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-neutral-600 mt-1">
                      {Math.round(layer.ms)}ms — {layer.description}
                    </p>
                  </div>
                ))}
            </div>
          </section>

          {/* Dashboard Waterfall */}
          <section className="p-6 bg-neutral-900 rounded-xl border border-neutral-800">
            <h2 className="text-lg font-semibold mb-1">Dashboard Query Waterfall</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Sequential: {Math.round(report.raw.dashboard.sequential.total_ms)}ms |
              Parallel: {Math.round(report.raw.dashboard.parallel.total_ms)}ms |
              Savings: {report.raw.dashboard.savings_pct}%
            </p>

            <h3 className="text-sm font-medium text-neutral-400 mb-2">Sequential (current)</h3>
            <div className="space-y-1.5 mb-6">
              {report.raw.dashboard.sequential.queries.map((q) => (
                <Bar
                  key={q.label}
                  label={q.label}
                  ms={q.ms}
                  maxMs={Math.max(
                    ...report.raw.dashboard.sequential.queries.map((x) => x.ms)
                  )}
                  color={q.label.includes('api') ? 'bg-orange-500' : 'bg-blue-500'}
                />
              ))}
            </div>

            <h3 className="text-sm font-medium text-neutral-400 mb-2">Parallel (optimized)</h3>
            <div className="space-y-1.5">
              {report.raw.dashboard.parallel.queries.map((q) => (
                <Bar
                  key={q.label}
                  label={q.label}
                  ms={q.ms}
                  maxMs={Math.max(
                    ...report.raw.dashboard.sequential.queries.map((x) => x.ms)
                  )}
                  color={q.label.includes('api') ? 'bg-orange-500' : 'bg-green-500'}
                />
              ))}
            </div>

            <p className="text-xs text-neutral-600 mt-3">
              Orange bars = internal API calls (each re-triggers middleware auth overhead)
            </p>
          </section>

          {/* Recommendations */}
          <section className="p-6 bg-neutral-900 rounded-xl border border-neutral-800">
            <h2 className="text-lg font-semibold mb-4">Recommendations</h2>
            <div className="space-y-4">
              {report.recommendations.map((rec, i) => (
                <div key={i} className="flex gap-3">
                  <div className="pt-0.5">
                    <ImpactBadge impact={rec.impact} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-200">{rec.action}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{rec.detail}</p>
                    {rec.saving_ms && (
                      <p className="text-xs text-green-400 mt-0.5">
                        Estimated saving: ~{rec.saving_ms}ms
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Browser Timing */}
          {navTiming && (
            <section className="p-6 bg-neutral-900 rounded-xl border border-neutral-800">
              <h2 className="text-lg font-semibold mb-4">Browser Navigation Timing</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-neutral-500">DNS Lookup:</span>{' '}
                  <span className="font-mono tabular-nums">
                    {Math.round(navTiming.domainLookupEnd - navTiming.domainLookupStart)}ms
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">TCP Connect:</span>{' '}
                  <span className="font-mono tabular-nums">
                    {Math.round(navTiming.connectEnd - navTiming.connectStart)}ms
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">TLS Negotiation:</span>{' '}
                  <span className="font-mono tabular-nums">
                    {Math.round(
                      navTiming.secureConnectionStart > 0
                        ? navTiming.connectEnd - navTiming.secureConnectionStart
                        : 0
                    )}ms
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">TTFB:</span>{' '}
                  <span className="font-mono tabular-nums">
                    {Math.round(navTiming.responseStart - navTiming.requestStart)}ms
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">DOM Content Loaded:</span>{' '}
                  <span className="font-mono tabular-nums">
                    {Math.round(navTiming.domContentLoadedEventEnd - navTiming.startTime)}ms
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Page Load:</span>{' '}
                  <span className="font-mono tabular-nums">
                    {Math.round(navTiming.loadEventEnd - navTiming.startTime)}ms
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Raw JSON */}
          <section className="p-6 bg-neutral-900 rounded-xl border border-neutral-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Raw Data</h2>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(report, null, 2));
                }}
                className="px-3 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
              >
                Copy JSON
              </button>
            </div>
            <pre className="text-xs text-neutral-400 overflow-x-auto max-h-96 overflow-y-auto">
              {JSON.stringify(report, null, 2)}
            </pre>
          </section>
        </div>
      )}
    </div>
  );
}
