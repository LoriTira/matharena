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
        <div className="text-white/25">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-white/40">Player not found</div>
        <Link href="/leaderboard" className="text-white/50 underline underline-offset-2 decoration-white/15 hover:text-white/70 text-sm">
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
      <Link href="/leaderboard" className="text-white/30 underline underline-offset-2 decoration-white/10 hover:text-white/50 text-sm transition-colors">
        Back to leaderboard
      </Link>

      <div className="border border-white/[0.06] rounded-sm p-8">
        <h1 className="font-serif text-3xl font-light text-white/90">{profile.display_name || profile.username}</h1>
        <p className="text-white/25 text-sm mt-1">@{profile.username}</p>
        {profile.country && (
          <p className="text-white/50 text-sm mt-3">
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
    </div>
  );
}
