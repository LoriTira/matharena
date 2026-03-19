'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Profile } from '@/types';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [affiliationType, setAffiliationType] = useState<'school' | 'company' | ''>('');
  const [saving, setSaving] = useState(false);
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
      }
    };

    fetchProfile();
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Loading profile...</div>
      </div>
    );
  }

  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">{profile.display_name || profile.username}</h1>
            <p className="text-gray-400">@{profile.username}</p>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
          >
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Affiliation</label>
              <input
                type="text"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                placeholder="MIT, Google, etc."
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              <select
                value={affiliationType}
                onChange={(e) => setAffiliationType(e.target.value as 'school' | 'company' | '')}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                <option value="school">School</option>
                <option value="company">Company</option>
              </select>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        ) : (
          <>
            {profile.affiliation && (
              <p className="text-gray-300">
                <span className="text-gray-500 capitalize">{profile.affiliation_type}: </span>
                {profile.affiliation}
              </p>
            )}
          </>
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
