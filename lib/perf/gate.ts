import { NextRequest, NextResponse } from 'next/server';

export function checkPerfAuth(request: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV === 'development') return null;

  const key = request.nextUrl.searchParams.get('key');
  const secret = process.env.PERF_SECRET;

  if (!secret || key !== secret) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return null;
}
