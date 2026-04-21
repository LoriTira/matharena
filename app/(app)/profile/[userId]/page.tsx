'use client';

import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFriendships } from '@/hooks/useFriendships';
import { Avatar } from '@/components/ui/Avatar';
import { RankBadge } from '@/components/ui/RankBadge';
import { MatchHistoryList } from '@/components/profile/MatchHistoryList';
import { FriendActionButton } from '@/components/profile/FriendActionButton';
import type { Profile, UserFriendshipState } from '@/types';

interface PublicProfileProps {
  params: Promise<{ userId: string }>;
}

/**
 * Public view of another user's profile. Shows core stats, an adaptive
 * friend/challenge CTA, and a paginated match history. When the viewer is
 * looking at their own id, redirect-ish affordance points back to the
 * editable /profile page.
 */
export default function PublicProfilePage({ params }: PublicProfileProps) {
  const { userId } = use(params);
  const { user } = useAuth();
  const { friends, pending_incoming, pending_outgoing } = useFriendships();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  // Local optimistic override for the friendship state — falls back to the
  // context-derived state until the Realtime refetch converges.
  const [overrideState, setOverrideState] = useState<UserFriendshipState | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) setProfile(data as Profile);
      setLoading(false);
    };

    fetchProfile();
  }, [userId, supabase]);

  // Reset the local override whenever shared state changes (a realtime
  // refetch has landed) so we don't stay stuck on a stale optimistic value.
  useEffect(() => {
    setOverrideState(null);
  }, [friends, pending_incoming, pending_outgoing]);

  const derivedState: UserFriendshipState = useMemo(() => {
    if (!user) return 'none';
    if (user.id === userId) return 'self';
    if (friends.some((f) => f.id === userId)) return 'accepted';
    if (pending_incoming.some((r) => r.id === userId)) return 'pending_incoming';
    if (pending_outgoing.some((r) => r.id === userId)) return 'pending_outgoing';
    return 'none';
  }, [user, userId, friends, pending_incoming, pending_outgoing]);

  const friendshipState = overrideState ?? derivedState;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-ink-muted">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-ink-tertiary">Player not found</div>
        <Link href="/leaderboard" className="text-ink-secondary underline underline-offset-2 decoration-edge hover:text-ink-secondary text-sm">
          Back to leaderboard
        </Link>
      </div>
    );
  }

  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Link href="/leaderboard" className="text-ink-muted underline underline-offset-2 decoration-edge hover:text-ink-secondary text-sm transition-colors">
        Back to leaderboard
      </Link>

      <div className="border border-edge rounded-sm p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar user={profile} size="lg" />
            <div className="min-w-0">
              <h1 className="font-serif text-3xl font-normal text-ink truncate">
                {profile.display_name || profile.username}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-ink-muted text-sm">@{profile.username}</p>
                <RankBadge elo={profile.elo_rating} size="sm" />
              </div>
            </div>
          </div>
          {user && (
            <div className="shrink-0">
              <FriendActionButton
                targetUserId={userId}
                friendship={friendshipState}
                onStateChange={setOverrideState}
              />
            </div>
          )}
        </div>

        {(profile.country || profile.affiliation) && (
          <div className="mt-4 space-y-1">
            {profile.country && (
              <p className="text-ink-secondary text-sm">
                <span className="text-ink-faint">Country: </span>
                {profile.country}
              </p>
            )}
            {profile.affiliation && (
              <p className="text-ink-secondary text-sm">
                <span className="text-ink-faint capitalize">{profile.affiliation_type}: </span>
                {profile.affiliation}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-shade rounded-sm overflow-hidden">
        <div className="bg-page p-5 text-center">
          <div className="text-[11px] tracking-[2px] text-ink-faint mb-2">RATING</div>
          <div className="font-mono text-2xl text-ink tabular-nums">{profile.elo_rating}</div>
        </div>
        <div className="bg-page p-5 text-center">
          <div className="text-[11px] tracking-[2px] text-ink-faint mb-2">GAMES</div>
          <div className="font-mono text-2xl text-ink tabular-nums">{profile.games_played}</div>
        </div>
        <div className="bg-page p-5 text-center">
          <div className="text-[11px] tracking-[2px] text-ink-faint mb-2">WINS</div>
          <div className="font-mono text-2xl text-ink tabular-nums">{profile.games_won}</div>
        </div>
        <div className="bg-page p-5 text-center">
          <div className="text-[11px] tracking-[2px] text-ink-faint mb-2">WIN RATE</div>
          <div className="font-mono text-2xl text-ink tabular-nums">{winRate}%</div>
        </div>
      </div>

      <MatchHistoryList
        userId={userId}
        viewerId={user?.id ?? userId}
        ownerLabel={(profile.display_name || profile.username || 'PLAYER').toUpperCase()}
      />
    </div>
  );
}
