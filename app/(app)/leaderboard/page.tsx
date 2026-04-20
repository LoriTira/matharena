'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useFriendships } from '@/hooks/useFriendships';
import { Panel } from '@/components/arcade/Panel';
import { RankPip } from '@/components/arcade/RankPip';
import { Skeleton } from '@/components/ui/Skeleton';
import { getRank } from '@/lib/ranks';
import { TIER_COLORS, type Tier } from '@/components/arcade/tokens';
import type { Profile } from '@/types';

type Scope = 'Global' | 'Friends' | 'Country';

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

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { friends } = useFriendships();
  const [players, setPlayers] = useState<Profile[]>([]);
  const [myCountry, setMyCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [scope, setScope] = useState<Scope>('Global');
  const supabase = useMemo(() => createClient(), []);

  // Resolve the current user's country once so the 'Country' scope query
  // has a real value — not a placeholder.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('country')
        .eq('id', user.id)
        .single();
      if (data?.country) setMyCountry(data.country);
    })();
  }, [user, supabase]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      let query = supabase
        .from('profiles')
        .select('*')
        .order('elo_rating', { ascending: false })
        .limit(100);

      if (filter) {
        query = query.ilike('affiliation', `%${filter}%`);
      }

      if (scope === 'Friends') {
        const friendIds = friends.map((f) => f.id);
        // Always include the viewer so they can see themselves in their friends board.
        if (user) friendIds.push(user.id);
        if (friendIds.length === 0) {
          setPlayers([]);
          setLoading(false);
          return;
        }
        query = query.in('id', friendIds);
      } else if (scope === 'Country') {
        if (!myCountry) {
          // No country set on viewer's profile — real answer is "empty board",
          // not a faked list.
          setPlayers([]);
          setLoading(false);
          return;
        }
        query = query.eq('country', myCountry);
      }

      const { data } = await query;
      if (data) setPlayers(data as Profile[]);
      setLoading(false);
    };
    fetchLeaderboard();
  }, [filter, scope, friends, myCountry, user, supabase]);

  const me = user ? players.find((p) => p.id === user.id) : null;
  const meRank = user ? players.findIndex((p) => p.id === user.id) + 1 : 0;
  const top3 = players.slice(0, 3);
  const otherRows = players.slice(0, 20);

  const scopeAvailability: Record<Scope, { available: boolean; reason?: string }> = {
    Global: { available: true },
    Friends: {
      available: !!user && friends.length > 0,
      reason: !user ? 'sign in' : friends.length === 0 ? 'no friends yet' : undefined,
    },
    Country: {
      available: !!myCountry,
      reason: !user ? 'sign in' : 'set your country in profile',
    },
  };

  const emptyMessage =
    scope === 'Friends' && (!user || friends.length === 0)
      ? user
        ? 'Add friends to see a friends-only board'
        : 'Sign in to see a friends board'
      : scope === 'Country' && !myCountry
        ? 'Set your country in profile to see a country board'
        : 'No players found';

  return (
    <div className="space-y-[14px]">
      {/* Header */}
      <div className="flex items-end justify-between gap-[18px] flex-wrap mb-2">
        <div>
          <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[2px] mb-[8px]">
            / Rankings
          </div>
          <h1 className="font-display font-extrabold text-[30px] md:text-[52px] tracking-[-1.2px] leading-[1]">
            The <span className="text-gold italic">top</span> of the arena.
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex border border-edge-strong">
            {(['Global', 'Friends', 'Country'] as Scope[]).map((t, i) => {
              const avail = scopeAvailability[t];
              return (
                <button
                  key={t}
                  onClick={() => setScope(t)}
                  disabled={!avail.available}
                  title={!avail.available ? avail.reason : undefined}
                  className={`font-mono text-[10px] uppercase tracking-[1.4px] font-bold px-[14px] py-[8px] transition-colors ${
                    i > 0 ? 'border-l border-edge-strong' : ''
                  } ${
                    scope === t ? 'bg-cyan text-[#0a0612]' : 'text-ink-tertiary hover:text-ink'
                  } ${!avail.available ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by school/company…"
            className="font-mono text-[12px] px-3 py-2 bg-panel border border-edge text-ink placeholder:text-ink-faint focus:outline-none focus:border-cyan w-60 transition-colors"
          />
        </div>
      </div>

      {/* Podium (desktop, Global scope only — podium is a ranking concept tied
          to the global board, not a friends or country subset) */}
      {!loading && scope === 'Global' && !filter && top3.length >= 3 && (
        <div className="hidden md:grid grid-cols-[1fr_1.1fr_1fr] gap-[10px] mb-[4px] items-end">
          {[top3[1], top3[0], top3[2]].map((p) => {
            const rank = players.findIndex((q) => q.id === p.id) + 1;
            const isFirst = rank === 1;
            const color = rank === 1 ? TIER_COLORS.Gold : rank === 2 ? TIER_COLORS.Silver : TIER_COLORS.Bronze;
            const initial = (p.display_name || p.username)?.[0]?.toUpperCase() ?? '?';
            return (
              <Link
                key={p.id}
                href={`/profile/${p.id}`}
                className={`border text-center relative block ${isFirst ? 'py-8 px-6' : 'py-6 px-5'}`}
                style={{
                  borderColor: color,
                  background: `linear-gradient(180deg, ${color}15, transparent)`,
                  boxShadow: isFirst ? `0 0 30px ${color}44` : 'none',
                }}
              >
                <div
                  className="font-mono font-extrabold tracking-[1px]"
                  style={{ fontSize: isFirst ? 22 : 16, color }}
                >
                  #{rank}
                </div>
                <div
                  className="grid place-items-center mx-auto my-[14px] font-display font-extrabold text-[#0a0612]"
                  style={{
                    width: isFirst ? 72 : 56,
                    height: isFirst ? 72 : 56,
                    fontSize: isFirst ? 28 : 22,
                    background: `radial-gradient(circle at 30% 30%, ${color}, ${color}33)`,
                    border: `2px solid ${color}`,
                    boxShadow: `0 0 20px ${color}66`,
                  }}
                >
                  {initial}
                </div>
                <div className="font-display font-bold text-[14px] md:text-[16px] text-ink">
                  {p.display_name || p.username}
                </div>
                <div className="font-mono text-[11px] tracking-[1.2px] mt-[6px]" style={{ color }}>
                  {p.elo_rating} Elo
                </div>
                {(p.country || p.affiliation) && (
                  <div className="font-mono text-[9px] text-ink-tertiary mt-[4px] tracking-[1.2px] uppercase">
                    {[p.country, p.affiliation].filter(Boolean).join(' · ')}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Dense table */}
      <Panel padding={0}>
        <div className="grid items-center font-mono text-[9px] text-ink-faint uppercase tracking-[1.6px] px-[14px] md:px-[18px] py-[14px] border-b border-edge gap-3 grid-cols-[28px_28px_1fr_56px_48px] md:grid-cols-[50px_36px_1fr_minmax(70px,90px)_80px_80px]">
          <span>#</span>
          <span>Tier</span>
          <span>Player</span>
          <span className="text-right hidden md:block">Country</span>
          <span className="text-right">Elo</span>
          <span className="text-right">Win%</span>
        </div>

        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid px-[14px] md:px-[18px] py-[12px] border-b border-edge gap-3 grid-cols-[28px_28px_1fr_56px_48px] md:grid-cols-[50px_36px_1fr_minmax(70px,90px)_80px_80px]">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-12 ml-auto hidden md:block" />
              <Skeleton className="h-4 w-12 ml-auto" />
              <Skeleton className="h-4 w-10 ml-auto" />
            </div>
          ))
        ) : (
          otherRows.map((p) => {
            const rk = players.findIndex((q) => q.id === p.id) + 1;
            const winRate =
              p.games_played > 0 ? Math.round((p.games_won / p.games_played) * 100) : 0;
            const tier = tierToArcade(getRank(p.elo_rating).tier);
            const isMe = user && p.id === user.id;

            const baseStyle = isMe
              ? { background: 'linear-gradient(90deg, rgba(54,228,255,0.13), transparent)' }
              : undefined;
            const borderClass = isMe
              ? 'border-t border-b border-cyan'
              : 'border-b border-edge';

            return (
              <Link
                key={p.id}
                href={`/profile/${p.id}`}
                className={`grid items-center px-[14px] md:px-[18px] py-[12px] font-mono text-[12px] gap-3 hover:bg-tint transition-colors grid-cols-[28px_28px_1fr_56px_48px] md:grid-cols-[50px_36px_1fr_minmax(70px,90px)_80px_80px] ${borderClass}`}
                style={baseStyle}
              >
                <span
                  className={`font-bold ${rk <= 3 && scope === 'Global' ? 'text-gold' : 'text-ink-tertiary'} ${isMe ? 'text-cyan' : ''}`}
                >
                  {rk}
                </span>
                <RankPip tier={tier} size={20} />
                <span className={`font-display font-semibold text-[14px] ${isMe ? 'text-cyan' : 'text-ink'} truncate`}>
                  {p.display_name || p.username}
                  {isMe && (
                    <span className="font-mono text-[9px] tracking-[1.4px] ml-2 opacity-70">YOU</span>
                  )}
                </span>
                <span className="text-right text-ink-tertiary text-[10px] tracking-[1.2px] uppercase hidden md:block">
                  {p.country ?? '—'}
                </span>
                <span className={`text-right font-bold ${isMe ? 'text-cyan' : 'text-cyan'}`}>{p.elo_rating}</span>
                <span className="text-right text-ink-tertiary">
                  {p.games_played > 0 ? `${winRate}%` : '—'}
                </span>
              </Link>
            );
          })
        )}

        {/* Pinned user row when viewer is outside top 20 (Global scope only) */}
        {!loading && scope === 'Global' && me && meRank > 20 && (
          <div
            className="grid items-center px-[14px] md:px-[18px] py-[14px] font-mono text-[12px] gap-3 border-t border-cyan grid-cols-[28px_28px_1fr_56px_48px] md:grid-cols-[50px_36px_1fr_minmax(70px,90px)_80px_80px]"
            style={{
              background: 'linear-gradient(90deg, rgba(54,228,255,0.13), transparent)',
            }}
          >
            <span className="text-cyan font-bold">{meRank}</span>
            <RankPip tier={tierToArcade(getRank(me.elo_rating).tier)} size={20} />
            <span className="font-display font-bold text-[14px] text-cyan">
              {me.display_name || me.username}
              <span className="font-mono text-[9px] tracking-[1.4px] ml-2 opacity-70">YOU</span>
            </span>
            <span className="text-right text-ink-tertiary text-[10px] tracking-[1.2px] uppercase hidden md:block">
              {me.country ?? '—'}
            </span>
            <span className="text-right text-cyan font-bold">{me.elo_rating}</span>
            <span className="text-right text-ink-tertiary">
              {me.games_played > 0 ? `${Math.round((me.games_won / me.games_played) * 100)}%` : '—'}
            </span>
          </div>
        )}

        {!loading && players.length === 0 && (
          <div className="text-center py-12 font-mono text-[12px] text-ink-faint uppercase tracking-[1.4px]">
            {emptyMessage}
          </div>
        )}
      </Panel>

      {!loading && players.length > 0 && (
        <div className="text-center font-mono text-[10px] text-ink-faint tracking-[1.2px] uppercase mt-[14px]">
          Showing {Math.min(players.length, 20)} of {players.length}
        </div>
      )}
    </div>
  );
}
