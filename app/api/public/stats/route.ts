import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
// Cache for 5 minutes — the headline aggregates don't need to be live-accurate.
export const revalidate = 300;

/**
 * Public landing-page aggregates. All values come from real tables; any that
 * can't be computed return null and the caller should omit the UI block.
 *
 * - totalPlayers: rows in `profiles` (public)
 * - countriesRepresented: distinct non-null `profiles.country` values
 * - totalDuels: count of `matches` with status='completed' (admin, anon can't read)
 * - activeMatches: count of `matches` with status in ('waiting','active')
 */
export async function GET() {
  try {
    const admin = createAdminClient();

    const [playersRes, countriesRes, duelsRes, activeRes] = await Promise.all([
      admin.from('profiles').select('id', { count: 'exact', head: true }),
      admin
        .from('profiles')
        .select('country')
        .not('country', 'is', null)
        .neq('country', ''),
      admin
        .from('matches')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed'),
      admin
        .from('matches')
        .select('id', { count: 'exact', head: true })
        .in('status', ['waiting', 'active']),
    ]);

    const countries = new Set<string>();
    for (const row of (countriesRes.data ?? []) as { country: string | null }[]) {
      if (row.country) countries.add(row.country);
    }

    return NextResponse.json({
      totalPlayers: playersRes.count ?? null,
      countriesRepresented: countries.size || null,
      totalDuels: duelsRes.count ?? null,
      activeMatches: activeRes.count ?? null,
    });
  } catch {
    // If the admin client isn't configured (e.g. preview env without
    // SUPABASE_SERVICE_ROLE_KEY), return nulls so the UI omits the block.
    return NextResponse.json({
      totalPlayers: null,
      countriesRepresented: null,
      totalDuels: null,
      activeMatches: null,
    });
  }
}
