import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { SOCIAL_CONFIG } from '@/lib/constants';
import { escapeLikePattern, friendshipState } from '@/lib/friends';
import type { UserSearchResult, Friendship } from '@/types';

/**
 * GET /api/users/search?q=<query>
 *
 * Username/display-name search. Returns up to SOCIAL_CONFIG.USER_SEARCH_RESULT_LIMIT
 * profiles, each annotated with the viewer's current friendship state so
 * FriendActionButton can render the right label without a second round-trip.
 *
 * Deliberately no email search — emails live in auth.users and exposing them
 * would leak the user directory.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const rawQ = (url.searchParams.get('q') ?? '').trim();

    if (rawQ.length < SOCIAL_CONFIG.USER_SEARCH_MIN_CHARS) {
      return NextResponse.json({ results: [] });
    }
    const q = rawQ.slice(0, SOCIAL_CONFIG.USER_SEARCH_MAX_CHARS);
    const escaped = escapeLikePattern(q);
    const pattern = `%${escaped}%`;

    // Username + display_name ILIKE. Exact-prefix matches bubble to the top
    // via a client-side sort (Supabase's PostgREST doesn't expose raw CASE
    // in .order, so we sort in-process after fetching).
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, elo_rating')
      .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
      .limit(SOCIAL_CONFIG.USER_SEARCH_RESULT_LIMIT * 2);

    if (profilesError) {
      console.error('User search error:', profilesError);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    const rows = (profiles ?? []) as Array<{
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      elo_rating: number;
    }>;

    // Boost rows whose username starts with the query, then by elo DESC.
    const lowered = q.toLowerCase();
    rows.sort((a, b) => {
      const aStart = a.username.toLowerCase().startsWith(lowered) ? 1 : 0;
      const bStart = b.username.toLowerCase().startsWith(lowered) ? 1 : 0;
      if (aStart !== bStart) return bStart - aStart;
      return b.elo_rating - a.elo_rating;
    });

    const limited = rows.slice(0, SOCIAL_CONFIG.USER_SEARCH_RESULT_LIMIT);
    const ids = limited.map(r => r.id);

    // Fetch friendship state for this batch. Two queries (me as user_a, me as
    // user_b) are simpler than trying to express (A OR B) AND (C IN ids) in
    // PostgREST's query syntax.
    const friendshipsByOther = new Map<string, Friendship>();
    if (ids.length > 0) {
      const [{ data: asA }, { data: asB }] = await Promise.all([
        supabase
          .from('friendships')
          .select('user_a, user_b, status, requested_by, created_at, accepted_at')
          .eq('user_a', user.id)
          .in('user_b', ids),
        supabase
          .from('friendships')
          .select('user_a, user_b, status, requested_by, created_at, accepted_at')
          .eq('user_b', user.id)
          .in('user_a', ids),
      ]);

      for (const f of ((asA ?? []) as Friendship[])) {
        friendshipsByOther.set(f.user_b, f);
      }
      for (const f of ((asB ?? []) as Friendship[])) {
        friendshipsByOther.set(f.user_a, f);
      }
    }

    const results: UserSearchResult[] = limited.map(row => {
      const fs = friendshipsByOther.get(row.id);
      return {
        id: row.id,
        username: row.username,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
        elo_rating: row.elo_rating,
        friendship: {
          status: friendshipState(user.id, row.id, fs),
          requested_by: fs?.requested_by ?? null,
        },
      };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
