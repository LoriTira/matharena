import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const revalidate = 300;

/**
 * Public top-N players for the landing page preview. Uses the anon client —
 * `profiles` is publicly readable per the RLS policy in 001_initial_schema.sql.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '5', 10) || 5, 20);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, elo_rating, country, affiliation, games_played, games_won')
    .order('elo_rating', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ players: [] });
  }

  return NextResponse.json({ players: data ?? [] });
}
