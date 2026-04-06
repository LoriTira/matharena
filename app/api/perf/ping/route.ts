import { NextRequest, NextResponse } from 'next/server';
import { checkPerfAuth } from '@/lib/perf/gate';

let invocationCount = 0;
const bootTime = Date.now();

export async function GET(request: NextRequest) {
  const denied = checkPerfAuth(request);
  if (denied) return denied;

  const start = performance.now();
  invocationCount++;

  const ms = Math.round((performance.now() - start) * 100) / 100;

  return NextResponse.json({
    cold: invocationCount === 1,
    invocationCount,
    instanceBootedAt: new Date(bootTime).toISOString(),
    ms,
  });
}
