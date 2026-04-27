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
    <div className="max-w-3xl mx-auto space-y-7">
      <Link href="/leaderboard" className="text-ink-tertiary font-bold hover:text-accent text-[13px] transition-colors">
        ← Back to leaderboard
      </Link>

      <div className="border-2 border-edge-strong bg-panel rounded-xl p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar user={profile} size="lg" />
            <div className="min-w-0">
              <div className="text-[10px] tracking-[3px] font-black text-accent mb-1">▸ PLAYER</div>
              <h1 className="font-serif text-3xl sm:text-4xl font-black text-ink truncate tracking-tight leading-none">
                {profile.display_name || profile.username}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-ink-tertiary text-[13px] font-semibold">@{profile.username}</p>
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
          <div className="mt-5 space-y-2">
            {profile.country && (
              <p className="text-ink-secondary text-[14px] font-semibold">
                <span className="text-ink-tertiary text-[11px] tracking-[2px] font-black uppercase mr-2">Country</span>
                {profile.country}
              </p>
            )}
            {profile.affiliation && (
              <p className="text-ink-secondary text-[14px] font-semibold">
                <span className="text-ink-tertiary text-[11px] tracking-[2px] font-black uppercase capitalize mr-2">{profile.affiliation_type}</span>
                {profile.affiliation}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-panel border-2 border-edge-strong rounded-xl p-5 text-center">
          <div className="text-[10px] tracking-[2.5px] font-black text-ink-tertiary mb-2">RATING</div>
          <div className="font-mono text-3xl font-black text-accent tabular-nums">{profile.elo_rating}</div>
        </div>
        <div className="bg-panel border-2 border-edge-strong rounded-xl p-5 text-center">
          <div className="text-[10px] tracking-[2.5px] font-black text-ink-tertiary mb-2">GAMES</div>
          <div className="font-mono text-3xl font-black text-ink tabular-nums">{profile.games_played}</div>
        </div>
        <div className="bg-panel border-2 border-edge-strong rounded-xl p-5 text-center">
          <div className="text-[10px] tracking-[2.5px] font-black text-ink-tertiary mb-2">WINS</div>
          <div className="font-mono text-3xl font-black text-ink tabular-nums">{profile.games_won}</div>
        </div>
        <div className="bg-panel border-2 border-edge-strong rounded-xl p-5 text-center">
          <div className="text-[10px] tracking-[2.5px] font-black text-ink-tertiary mb-2">WIN RATE</div>
          <div className="font-mono text-3xl font-black text-ink tabular-nums">{winRate}%</div>
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
