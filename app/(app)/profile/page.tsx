'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Profile, Challenge, UserAchievement } from '@/types';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { AchievementBadge } from '@/components/ui/AchievementBadge';
import { Skeleton } from '@/components/ui/Skeleton';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [affiliationType, setAffiliationType] = useState<'school' | 'company' | ''>('');
  const [country, setCountry] = useState('');
  const [saving, setSaving] = useState(false);
  const [friends, setFriends] = useState<{ id: string; username: string; display_name: string | null; elo_rating: number }[]>([]);
  const [rechallengingId, setRechallengingId] = useState<string | null>(null);
  const [earnedAchievementIds, setEarnedAchievementIds] = useState<Set<string>>(new Set());
  const supabase = createClient();

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    // Friends = unique opponents from completed challenges
    const { data: completedChallenges } = await supabase
      .from('challenges')
      .select('sender_id, recipient_id')
      .eq('status', 'completed')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);

    if (!completedChallenges || completedChallenges.length === 0) return;

    const opponentIds = [...new Set(
      (completedChallenges as Pick<Challenge, 'sender_id' | 'recipient_id'>[])
        .map(c => c.sender_id === user.id ? c.recipient_id : c.sender_id)
        .filter((id): id is string => id !== null)
    )];

    if (opponentIds.length === 0) return;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, elo_rating')
      .in('id', opponentIds);

    if (profiles) {
      setFriends(profiles as { id: string; username: string; display_name: string | null; elo_rating: number }[]);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        const p = data as Profile;
        setProfile(p);
        setDisplayName(p.display_name || '');
        setAffiliation(p.affiliation || '');
        setAffiliationType((p.affiliation_type as 'school' | 'company') || '');
        setCountry(p.country || '');
      }
    };

    fetchProfile();
    fetchFriends();

    const fetchAchievements = async () => {
      try {
        const { data } = await supabase
          .from('user_achievements')
          .select('achievement_id')
          .eq('user_id', user.id);

        if (data) {
          setEarnedAchievementIds(new Set((data as Pick<UserAchievement, 'achievement_id'>[]).map(a => a.achievement_id)));
        }
      } catch {
        // Table may not exist yet; ignore
      }
    };
    fetchAchievements();
  }, [user, fetchFriends]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: displayName || null,
        affiliation: affiliation || null,
        affiliation_type: affiliationType || null,
        country: country || null,
      }),
    });

    const data = await res.json();
    if (data.profile) {
      setProfile(data.profile as Profile);
      setEditing(false);
    }
    setSaving(false);
  };

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Profile card skeleton */}
        <div className="border border-white/[0.06] rounded-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-14 h-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>

        {/* Stats grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.04] rounded-sm overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#050505] p-5 flex flex-col items-center gap-2">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>

        {/* Trophy case skeleton */}
        <div>
          <Skeleton className="h-3 w-24 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="border border-white/[0.06] rounded-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl font-light text-white/90">{profile.display_name || profile.username}</h1>
            <p className="text-white/25 text-sm mt-1">@{profile.username}</p>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="px-4 py-2 text-[10px] tracking-[1.5px] text-white/30 border border-white/[0.08] hover:border-white/20 hover:text-white/50 rounded-sm transition-colors"
          >
            {editing ? 'CANCEL' : 'EDIT PROFILE'}
          </button>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-[9px] tracking-[2px] text-white/25 mb-2 uppercase">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-sm text-white/80 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/15 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[9px] tracking-[2px] text-white/25 mb-2 uppercase">Affiliation</label>
              <input
                type="text"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                placeholder="MIT, Google, etc."
                className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-sm text-white/80 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/15 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[9px] tracking-[2px] text-white/25 mb-2 uppercase">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="United States, France, etc."
                className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-sm text-white/80 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/15 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[9px] tracking-[2px] text-white/25 mb-2 uppercase">Type</label>
              <select
                value={affiliationType}
                onChange={(e) => setAffiliationType(e.target.value as 'school' | 'company' | '')}
                className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-sm text-white/80 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/15 transition-colors"
              >
                <option value="">None</option>
                <option value="school">School</option>
                <option value="company">Company</option>
              </select>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-white/90 text-[#050505] font-semibold text-xs tracking-[1.5px] rounded-sm transition-colors hover:bg-white disabled:opacity-50"
            >
              {saving ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
          </div>
        ) : (
          <>
            {profile.country && (
              <p className="text-white/50 text-sm">
                <span className="text-white/20">Country: </span>
                {profile.country}
              </p>
            )}
            {profile.affiliation && (
              <p className="text-white/50 text-sm mt-1">
                <span className="text-white/20 capitalize">{profile.affiliation_type}: </span>
                {profile.affiliation}
              </p>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.04] rounded-sm overflow-hidden">
        <div className="bg-[#050505] p-5 text-center">
          <div className="text-[9px] tracking-[2px] text-white/20 mb-2">RATING</div>
          <div className="font-mono text-2xl text-white/85 tabular-nums">{profile.elo_rating}</div>
        </div>
        <div className="bg-[#050505] p-5 text-center">
          <div className="text-[9px] tracking-[2px] text-white/20 mb-2">GAMES</div>
          <div className="font-mono text-2xl text-white/85 tabular-nums">{profile.games_played}</div>
        </div>
        <div className="bg-[#050505] p-5 text-center">
          <div className="text-[9px] tracking-[2px] text-white/20 mb-2">WINS</div>
          <div className="font-mono text-2xl text-white/85 tabular-nums">{profile.games_won}</div>
        </div>
        <div className="bg-[#050505] p-5 text-center">
          <div className="text-[9px] tracking-[2px] text-white/20 mb-2">WIN RATE</div>
          <div className="font-mono text-2xl text-white/85 tabular-nums">{winRate}%</div>
        </div>
      </div>

      {/* Friends */}
      {friends.length > 0 && (
        <div>
          <div className="text-[9px] tracking-[3px] text-white/20 mb-4">FRIENDS</div>
          <div className="border border-white/[0.04] rounded-sm overflow-hidden">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.03] last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full border border-white/[0.12] flex items-center justify-center text-[11px] text-white/50">
                    {(friend.display_name || friend.username)[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[13px] text-white/60">{friend.display_name || friend.username}</div>
                    <div className="font-mono text-[11px] text-white/20">Elo {friend.elo_rating}</div>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    setRechallengingId(friend.id);
                    try {
                      const res = await fetch('/api/challenge/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ recipientId: friend.id }),
                      });
                      if (res.ok) {
                        fetchFriends();
                      }
                    } catch {
                      // silently fail
                    }
                    setRechallengingId(null);
                  }}
                  disabled={rechallengingId === friend.id}
                  className="px-3 py-1.5 border border-white/[0.08] text-white/30 text-[10px] tracking-[1px] rounded-sm hover:border-white/[0.15] hover:text-white/50 transition-colors disabled:opacity-50"
                >
                  {rechallengingId === friend.id ? 'SENDING...' : 'RE-CHALLENGE'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trophy Case */}
      <div>
        <div className="text-[9px] tracking-[3px] text-white/20 mb-4">TROPHY CASE</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[...ACHIEVEMENTS]
            .sort((a, b) => {
              const aUnlocked = earnedAchievementIds.has(a.id);
              const bUnlocked = earnedAchievementIds.has(b.id);
              if (aUnlocked && !bUnlocked) return -1;
              if (!aUnlocked && bUnlocked) return 1;
              return 0;
            })
            .map((achievement) => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                unlocked={earnedAchievementIds.has(achievement.id)}
                size="md"
              />
            ))}
        </div>
        {earnedAchievementIds.size > 0 && (
          <div className="text-center text-white/15 text-[11px] mt-4">
            {earnedAchievementIds.size} / {ACHIEVEMENTS.length} unlocked
          </div>
        )}
      </div>
    </div>
  );
}
