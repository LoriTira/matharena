'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import type { Challenge, Profile } from '@/types';

function PlayerCard({ profile, ready, isYou }: { profile: Profile | null; ready: boolean; isYou: boolean }) {
  if (!profile) return null;
  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0;

  return (
    <div className={`border rounded-sm p-6 flex-1 min-w-[200px] transition-colors ${
      isYou ? 'border-white/[0.12] bg-white/[0.03]' : 'border-white/[0.06] bg-white/[0.01]'
    }`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full transition-colors ${ready ? 'bg-green-400/80' : 'bg-white/10'}`} />
        <span className="text-[9px] tracking-[2px] text-white/30">
          {ready ? 'READY' : 'WAITING'}
        </span>
      </div>
      <div className="font-serif text-lg text-white/80 mb-1">
        {profile.display_name || profile.username}
      </div>
      <div className="font-mono text-sm text-white/30 mb-3">
        Elo {profile.elo_rating.toLocaleString()}
      </div>
      <div className="flex gap-4 text-[11px] text-white/20">
        <span>{profile.games_played} played</span>
        <span>{winRate}% win</span>
      </div>
      {isYou && (
        <div className="text-[9px] tracking-[1.5px] text-white/15 mt-3">YOU</div>
      )}
    </div>
  );
}

export default function ChallengeLobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [senderProfile, setSenderProfile] = useState<Profile | null>(null);
  const [recipientProfile, setRecipientProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myReady, setMyReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [starting, setStarting] = useState(false);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch challenge and profiles
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push(`/login?redirect=/challenge/${code}/lobby`);
      return;
    }

    const fetchChallenge = async () => {
      const { data, error: fetchError } = await supabase
        .from('challenges')
        .select('*')
        .eq('code', code)
        .single();

      if (fetchError || !data) {
        setError('Challenge not found');
        setLoading(false);
        return;
      }

      const c = data as Challenge;

      // If challenge already has an active match, redirect
      if (c.match_id) {
        const { data: match } = await supabase
          .from('matches')
          .select('id, status')
          .eq('id', c.match_id)
          .single();

        if (match?.status === 'active' || match?.status === 'completed') {
          router.replace(`/play/${c.match_id}`);
          return;
        }
      }

      if (c.status !== 'accepted') {
        setError(c.status === 'pending' ? 'Challenge has not been accepted yet' : 'Challenge is no longer available');
        setLoading(false);
        return;
      }

      if (c.sender_id !== user.id && c.recipient_id !== user.id) {
        setError('You are not a participant in this challenge');
        setLoading(false);
        return;
      }

      setChallenge(c);

      const { data: sp } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', c.sender_id)
        .single();
      if (sp) setSenderProfile(sp as Profile);

      if (c.recipient_id) {
        const { data: rp } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', c.recipient_id)
          .single();
        if (rp) setRecipientProfile(rp as Profile);
      }

      setLoading(false);
    };

    fetchChallenge();
  }, [code, user, authLoading, router, supabase]);

  // Call /api/challenge/start — handles both stages:
  // First player: creates waiting match. Second player: activates it.
  // Same player calling again: returns current status without change.
  const callStart = useCallback(async () => {
    try {
      const res = await fetch('/api/challenge/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (data.status === 'active') {
        setMyReady(true);
        setOpponentReady(true);
        setStarting(true);
        if (pollRef.current) clearInterval(pollRef.current);
        router.replace(`/play/${data.matchId}`);
        return;
      }

      if (data.status === 'waiting') {
        setMyReady(true);
      }

      if (data.error && res.status === 409) {
        setError(data.error);
      }
    } catch {
      // Will retry on next poll
    }
  }, [code, router]);

  // Register + poll: call start immediately, then every 2s
  useEffect(() => {
    if (!challenge || !user || starting) return;

    // Initial call
    callStart();

    // Poll every 2 seconds
    pollRef.current = setInterval(callStart, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [challenge, user, starting, callStart]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-white/25">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-red-400/60 text-sm">{error}</div>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-2.5 border border-white/[0.08] text-white/40 text-[10px] tracking-[1.5px] rounded-sm hover:border-white/20 hover:text-white/60 transition-colors"
        >
          DASHBOARD
        </button>
      </div>
    );
  }

  if (!challenge || !senderProfile) return null;

  const isUserSender = user?.id === challenge.sender_id;
  const opponentProfile = isUserSender ? recipientProfile : senderProfile;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center">
        <div className="text-[9px] tracking-[3px] text-white/20 mb-2">CHALLENGE LOBBY</div>
        <h1 className="font-serif text-3xl font-light text-white/90">
          {starting ? 'Starting match...' : 'Waiting for players'}
        </h1>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch gap-4 w-full max-w-lg">
        <PlayerCard
          profile={isUserSender ? senderProfile : recipientProfile}
          ready={myReady}
          isYou={true}
        />
        <div className="flex items-center justify-center">
          <span className="font-serif text-xl text-white/20 italic">vs</span>
        </div>
        <PlayerCard
          profile={opponentProfile}
          ready={opponentReady}
          isYou={false}
        />
      </div>

      {starting ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border border-white/20 border-t-white/60 rounded-full animate-spin" />
          <p className="text-white/40 text-[13px]">Creating match...</p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-white/30 text-[13px] mb-6">
            {opponentReady
              ? 'Both players are here. Starting...'
              : `Waiting for ${opponentProfile?.display_name || opponentProfile?.username || 'opponent'} to join...`
            }
          </p>
          {!opponentReady && (
            <div className="w-10 h-10 mx-auto border border-white/10 border-t-white/40 rounded-full animate-spin" />
          )}
        </div>
      )}

      <button
        onClick={() => router.push('/dashboard')}
        className="px-6 py-2 text-[10px] tracking-[1.5px] text-white/20 hover:text-white/40 transition-colors"
      >
        CANCEL
      </button>
    </div>
  );
}
