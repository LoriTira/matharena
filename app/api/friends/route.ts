import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type {
  FriendSummary,
  FriendRequestSummary,
  FriendsResponse,
  Friendship,
} from '@/types';

/**
 * Returns the current user's friendships bucketed by status and direction.
 * Replaces the previous "derived from past matches" helper. The `friends` key
 * shape is kept backwards-compatible with ChallengeModal.tsx (id, username,
 * display_name, elo_rating, games_played, games_won).
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: rows, error: rowsError } = await supabase
      .from('friendships')
      .select('user_a, user_b, status, requested_by, created_at, accepted_at')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

    if (rowsError) {
      console.error('Friendships query error:', rowsError);
      return NextResponse.json({ error: 'Failed to load friends' }, { status: 500 });
    }

    const friendships = (rows ?? []) as Friendship[];

    // Collect the "other" id for each row — everything else is batch-fetched
    // against profiles in a single IN query to stay fast.
    const otherIds = Array.from(new Set(
      friendships.map(f => (f.user_a === user.id ? f.user_b : f.user_a))
    ));

    let profileById = new Map<string, {
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      elo_rating: number;
      games_played: number;
      games_won: number;
    }>();

    if (otherIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, elo_rating, games_played, games_won')
        .in('id', otherIds);

      if (profiles) {
        profileById = new Map(
          (profiles as Array<{
            id: string;
            username: string;
            display_name: string | null;
            avatar_url: string | null;
            elo_rating: number;
            games_played: number;
            games_won: number;
          }>).map(p => [p.id, p])
        );
      }
    }

    const friends: FriendSummary[] = [];
    const pending_incoming: FriendRequestSummary[] = [];
    const pending_outgoing: FriendRequestSummary[] = [];

    for (const f of friendships) {
      const otherId = f.user_a === user.id ? f.user_b : f.user_a;
      const profile = profileById.get(otherId);
      if (!profile) continue;

      if (f.status === 'accepted') {
        friends.push({
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          elo_rating: profile.elo_rating,
          games_played: profile.games_played,
          games_won: profile.games_won,
          since: f.accepted_at,
        });
      } else if (f.requested_by === user.id) {
        pending_outgoing.push({
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          elo_rating: profile.elo_rating,
          requested_at: f.created_at,
        });
      } else {
        pending_incoming.push({
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          elo_rating: profile.elo_rating,
          requested_at: f.created_at,
        });
      }
    }

    // Sort: accepted by most-recent first, pending by most-recent first.
    friends.sort((a, b) => (b.since ?? '').localeCompare(a.since ?? ''));
    pending_incoming.sort((a, b) => b.requested_at.localeCompare(a.requested_at));
    pending_outgoing.sort((a, b) => b.requested_at.localeCompare(a.requested_at));

    const response: FriendsResponse = {
      friends,
      pending_incoming,
      pending_outgoing,
      unread_count: pending_incoming.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Friends list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
