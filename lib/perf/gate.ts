import { NextRequest, NextResponse } from 'next/server';

const PERF_KEY = '574378117ad3863edf0e7a95457d1cca';

export function checkPerfAuth(request: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV === 'development') return null;

  const key = request.nextUrl.searchParams.get('key');
  if (key !== PERF_KEY) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return null;
}
