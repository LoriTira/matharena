'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { Profile } from '@/types';

interface PublicProfileProps {
  params: Promise<{ userId: string }>;
}

export default function PublicProfilePage({ params }: PublicProfileProps) {
  const { userId } = use(params);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) setProfile(data as Profile);
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

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
        <h1 className="font-serif text-3xl font-normal text-ink">{profile.display_name || profile.username}</h1>
        <p className="text-ink-muted text-sm mt-1">@{profile.username}</p>
        {profile.country && (
          <p className="text-ink-secondary text-sm mt-3">
            <span className="text-ink-faint">Country: </span>
            {profile.country}
          </p>
        )}
        {profile.affiliation && (
          <p className="text-ink-secondary text-sm mt-1">
            <span className="text-ink-faint capitalize">{profile.affiliation_type}: </span>
            {profile.affiliation}
          </p>
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
    </div>
  );
}
