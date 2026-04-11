import type { Friendship, UserFriendshipState } from '@/types';

/**
 * Canonical ordered pair — the friendships table stores each relationship
 * in exactly one row with `user_a < user_b`. Every read and write goes
 * through this helper so the invariant never breaks.
 */
export function canonicalPair(a: string, b: string): { user_a: string; user_b: string } {
  return a < b ? { user_a: a, user_b: b } : { user_a: b, user_b: a };
}

/**
 * Map a friendship row (if any) to the viewer-oriented state used by
 * FriendActionButton. Returns 'self' when viewer === target, 'none' when
 * no row exists, and a directional pending/accepted otherwise.
 */
export function friendshipState(
  viewerId: string,
  targetId: string,
  row: Friendship | null | undefined,
): UserFriendshipState {
  if (viewerId === targetId) return 'self';
  if (!row) return 'none';
  if (row.status === 'accepted') return 'accepted';
  return row.requested_by === viewerId ? 'pending_outgoing' : 'pending_incoming';
}

/**
 * Escape ILIKE wildcards so a user typing `%%%` can't make Postgres chew
 * through the entire profiles table on a partial match.
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
