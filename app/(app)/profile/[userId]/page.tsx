'use client';

import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFriendships } from '@/hooks/useFriendships';
import { Panel } from '@/components/arcade/Panel';
import { SectionHead } from '@/components/arcade/SectionHead';
import { RankPip } from '@/components/arcade/RankPip';
import { Btn } from '@/components/arcade/Btn';
import { MatchHistoryList } from '@/components/profile/MatchHistoryList';
import { FriendActionButton } from '@/components/profile/FriendActionButton';
import { getRank } from '@/lib/ranks';
import { type Tier } from '@/components/arcade/tokens';
import type { Profile, UserFriendshipState } from '@/types';

interface PublicProfileProps {
  params: Promise<{ userId: string }>;
}

function tierToArcade(tier: string): Tier {
  switch (tier) {
    case 'Bronze':      return 'Bronze';
    case 'Silver':      return 'Silver';
    case 'Gold':        return 'Gold';
    case 'Platinum':    return 'Platinum';
    case 'Diamond':     return 'Diamond';
    case 'Grandmaster': return 'Grand';
    default:            return 'Wood';
  }
}

export default function PublicProfilePage({ params }: PublicProfileProps) {
  const { userId } = use(params);
  const { user } = useAuth();
  const { friends, pending_incoming, pending_outgoing } = useFriendships();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
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

  useEffect(() => { setOverrideState(null); }, [friends, pending_incoming, pending_outgoing]);

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
      <div className="flex items-center justify-center min-h-[60vh] font-mono text-[12px] text-ink-tertiary uppercase tracking-[1.4px]">
        Loading…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="font-mono text-[12px] text-magenta uppercase tracking-[1.4px]">Player not found</div>
        <Link href="/leaderboard"><Btn size="sm" variant="ghost">← Back to leaderboard</Btn></Link>
      </div>
    );
  }

  const rank = getRank(profile.elo_rating);
  const arcadeTier = tierToArcade(rank.tier);
  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100) : 0;
  const initial = (profile.display_name || profile.username)?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="max-w-4xl mx-auto space-y-[14px]">
      <Link
        href="/leaderboard"
        className="inline-block font-mono text-[11px] text-ink-tertiary hover:text-cyan tracking-[1.4px] uppercase transition-colors"
      >
        ← Back to leaderboard
      </Link>

      <Panel padding={0} className="overflow-hidden">
        <div
          className="flex flex-col md:flex-row items-center gap-[16px] md:gap-[24px] text-center md:text-left p-[24px] md:p-[36px]"
          style={{
            background: 'linear-gradient(135deg, rgba(54,228,255,0.13), rgba(255,42,127,0.13) 70%, transparent)',
          }}
        >
          <div
            className="shrink-0 grid place-items-center font-display font-extrabold text-[#0a0612]"
            style={{
              width: 84,
              height: 84,
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-magenta))',
              boxShadow: '0 0 30px rgba(54,228,255,0.4)',
              fontSize: 42,
            }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[2px] mb-[4px]">
              @{profile.username}
              {profile.country ? ` · ${profile.country}` : ''}
              {profile.affiliation ? ` · ${profile.affiliation}` : ''}
            </div>
            <div className="font-display font-extrabold text-[26px] md:text-[40px] tracking-[-1px] leading-[1] text-ink truncate">
              {profile.display_name || profile.username}
            </div>
            <div className="mt-[10px] flex gap-[10px] items-center flex-wrap justify-center md:justify-start">
              <RankPip tier={arcadeTier} size={22} showLabel />
              <span className="font-mono text-[12px] text-cyan font-bold tracking-[1px]">
                {profile.elo_rating} Elo
              </span>
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
      </Panel>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px]">
        {[
          { l: 'Rating', v: String(profile.elo_rating), c: 'text-cyan' },
          { l: 'Games', v: String(profile.games_played), c: 'text-ink' },
          { l: 'Wins', v: String(profile.games_won), c: 'text-lime' },
          { l: 'Win rate', v: `${winRate}%`, c: 'text-gold' },
        ].map((s) => (
          <div key={s.l} className="border border-edge-strong bg-panel p-[16px] md:p-[20px]">
            <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[1.4px]">{s.l}</div>
            <div className={`font-display font-extrabold text-[26px] md:text-[32px] tracking-[-0.8px] mt-[6px] tabular-nums ${s.c}`}>{s.v}</div>
          </div>
        ))}
      </div>

      <Panel padding={24}>
        <SectionHead
          no="01"
          title={`Match history · ${(profile.display_name || profile.username).toUpperCase()}`}
          color="cyan"
        />
        <MatchHistoryList
          userId={userId}
          viewerId={user?.id ?? userId}
          ownerLabel={(profile.display_name || profile.username || 'PLAYER').toUpperCase()}
        />
      </Panel>
    </div>
  );
}
