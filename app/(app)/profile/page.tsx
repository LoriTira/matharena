'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Profile, UserAchievement } from '@/types';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { AchievementBadge } from '@/components/ui/AchievementBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { MatchHistoryList } from '@/components/profile/MatchHistoryList';
import { FriendsSection } from '@/components/profile/FriendsSection';
import { UserSearchModal } from '@/components/search/UserSearchModal';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [affiliationType, setAffiliationType] = useState<'school' | 'company' | ''>('');
  const [country, setCountry] = useState('');
  const [saving, setSaving] = useState(false);
  const [earnedAchievementIds, setEarnedAchievementIds] = useState<Set<string>>(new Set());
  const [sprintPB, setSprintPB] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const supabase = createClient();

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

    const fetchSprintPB = async () => {
      try {
        const { data } = await supabase
          .from('practice_sessions')
          .select('score')
          .eq('user_id', user.id)
          .eq('duration', 120)
          .order('score', { ascending: false })
          .limit(1)
          .single();
        if (data) setSprintPB(data.score);
      } catch {
        // No sprint sessions yet
      }
    };
    fetchSprintPB();
  }, [user]);

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
        <div className="border border-edge rounded-sm p-8">
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-shade rounded-sm overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-page p-5 flex flex-col items-center gap-2">
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
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="border-2 border-edge-strong bg-panel rounded-xl p-6 sm:p-8">
        <div className="flex items-start sm:items-center justify-between gap-4 mb-6 flex-col sm:flex-row">
          <div>
            <div className="text-[11px] tracking-[4px] font-black text-accent mb-2">▸ PROFILE</div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-black text-ink leading-none tracking-tight">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-ink-tertiary text-[13px] font-semibold mt-2">@{profile.username}</p>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="shrink-0 px-5 py-2.5 text-[11px] tracking-[2.5px] font-black text-ink border-2 border-edge-strong hover:border-edge-bold hover:bg-shade rounded-md transition-colors"
          >
            {editing ? 'CANCEL' : 'EDIT'}
          </button>
        </div>

        {editing ? (
          <div className="space-y-5">
            <div>
              <label className="block text-[11px] tracking-[2.5px] font-black text-ink-tertiary mb-2 uppercase">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3.5 bg-card border-2 border-edge-strong rounded-md text-ink font-medium focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] tracking-[2.5px] font-black text-ink-tertiary mb-2 uppercase">Affiliation</label>
              <input
                type="text"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                placeholder="MIT, Google, etc."
                className="w-full px-4 py-3.5 bg-card border-2 border-edge-strong rounded-md text-ink font-medium placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] tracking-[2.5px] font-black text-ink-tertiary mb-2 uppercase">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="United States, France, etc."
                className="w-full px-4 py-3.5 bg-card border-2 border-edge-strong rounded-md text-ink font-medium placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] tracking-[2.5px] font-black text-ink-tertiary mb-2 uppercase">Type</label>
              <select
                value={affiliationType}
                onChange={(e) => setAffiliationType(e.target.value as 'school' | 'company' | '')}
                className="w-full px-4 py-3.5 bg-card border-2 border-edge-strong rounded-md text-ink font-medium focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              >
                <option value="">None</option>
                <option value="school">School</option>
                <option value="company">Company</option>
              </select>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3.5 bg-accent text-on-accent font-black text-[12px] tracking-[2.5px] rounded-md transition-all hover:scale-[1.02] hover:bg-accent/90 shadow-[0_4px_20px_var(--accent-glow)] disabled:opacity-50"
            >
              {saving ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
          </div>
        ) : (
          <>
            {profile.country && (
              <p className="text-ink-secondary text-[14px] font-semibold">
                <span className="text-ink-tertiary text-[11px] tracking-[2px] font-black uppercase mr-2">Country</span>
                {profile.country}
              </p>
            )}
            {profile.affiliation && (
              <p className="text-ink-secondary text-[14px] font-semibold mt-2">
                <span className="text-ink-tertiary text-[11px] tracking-[2px] font-black uppercase capitalize mr-2">{profile.affiliation_type}</span>
                {profile.affiliation}
              </p>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
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
        <div className="bg-panel border-2 border-edge-strong rounded-xl p-5 text-center col-span-2 sm:col-span-1">
          <div className="text-[10px] tracking-[2.5px] font-black text-ink-tertiary mb-2">SPRINT PB</div>
          <div className="font-mono text-3xl font-black text-ink tabular-nums">{sprintPB ?? '—'}</div>
        </div>
      </div>

      {/* Match history */}
      <MatchHistoryList userId={user!.id} viewerId={user!.id} />

      {/* Friends & incoming requests */}
      <FriendsSection onOpenSearch={() => setSearchOpen(true)} />

      {/* Trophy Case */}
      <div>
        <div className="text-[12px] tracking-[3px] font-black text-accent mb-4">▸ TROPHY CASE</div>
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
          <div className="text-center text-ink-faint text-[11px] mt-4">
            {earnedAchievementIds.size} / {ACHIEVEMENTS.length} unlocked
          </div>
        )}
      </div>

      <UserSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
