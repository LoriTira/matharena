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
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-xl text-red-400">Player not found</div>
        <Link href="/leaderboard" className="text-blue-400 hover:text-blue-300">
          ← Back to leaderboard
        </Link>
      </div>
    );
  }

  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Link href="/leaderboard" className="text-blue-400 hover:text-blue-300 text-sm">
        ← Back to leaderboard
      </Link>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-white">{profile.display_name || profile.username}</h1>
        <p className="text-gray-400">@{profile.username}</p>
        {profile.country && (
          <p className="text-gray-300 mt-2">
            <span className="text-gray-500">Country: </span>
            {profile.country}
          </p>
        )}
        {profile.affiliation && (
          <p className="text-gray-300 mt-1">
            <span className="text-gray-500 capitalize">{profile.affiliation_type}: </span>
            {profile.affiliation}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-sm text-gray-400">Rating</div>
          <div className="text-2xl font-bold text-white">{profile.elo_rating}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-sm text-gray-400">Games</div>
          <div className="text-2xl font-bold text-white">{profile.games_played}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-sm text-gray-400">Wins</div>
          <div className="text-2xl font-bold text-green-400">{profile.games_won}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-sm text-gray-400">Win Rate</div>
          <div className="text-2xl font-bold text-white">{winRate}%</div>
        </div>
      </div>
    </div>
  );
}
