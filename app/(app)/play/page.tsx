'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMatchmaking } from '@/hooks/useMatchmaking';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { WarmupPanel } from '@/components/match/WarmupPanel';
import { SearchPanel } from '@/components/match/SearchPanel';
import { MatchFoundModal } from '@/components/match/MatchFoundModal';

function PlayContent() {
  const {
    isSearching,
    error,
    eloRange,
    matchStatus,
    pendingMatch,
    cooldownRemainingMs,
    selfAccepted,
    findMatch,
    cancel,
    acceptMatch,
    declineMatch,
  } = useMatchmaking();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasAutoSearched = useRef(false);

  // Player's Elo (fetched once for warmup difficulty calibration)
  const [playerElo, setPlayerElo] = useState<number | null>(null);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const supabase = useRef(createClient()).current;

  // Fetch profile Elo and online count on mount
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    supabase
      .from('profiles')
      .select('elo_rating')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) setPlayerElo((data as { elo_rating: number }).elo_rating);
      });

    // Estimate online activity. We only count 'waiting' and 'active' here to
    // stay compatible with installs that haven't applied migration 013 yet.
    // After the migration, 'pending_accept' is a momentary state (<10s) so
    // excluding it barely changes the number.
    supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .in('status', ['waiting', 'active'])
      .then(({ count }) => {
        if (!cancelled) setOnlineCount(count ?? 0);
      });

    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  // Auto-start search on mount (default behavior now — no button to click).
  // Honors the legacy ?autoSearch=true URL param for backwards compat.
  useEffect(() => {
    if (hasAutoSearched.current) return;
    if (!user) return;
    hasAutoSearched.current = true;
    // Clean up the legacy param if present — we always auto-search now.
    if (searchParams.get('autoSearch')) router.replace('/play');
    findMatch();
    // findMatch identity changes per render; we only want to run on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const showModal = matchStatus === 'pending_accept' && pendingMatch && user;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <header className="mb-7">
        <div className="text-[11px] tracking-[4px] font-black text-accent mb-2">▸ RANKED MATCH</div>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-black text-ink leading-none tracking-tight">
          Finding an opponent…
        </h1>
        <p className="text-[13px] sm:text-[14px] font-medium text-ink-tertiary mt-2">
          First to 5 wins · Elo on the line
        </p>
      </header>

      {/* Split view on desktop; stacked on mobile. On mobile the search panel
          comes FIRST (above warmup) so users see the search status — the real
          match information — before the warmup. Warmup is secondary content. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <div className="order-2 lg:order-1">
          <WarmupPanel
            playerElo={playerElo}
            paused={!!showModal || cooldownRemainingMs > 0 || !isSearching}
          />
        </div>
        <div className="order-1 lg:order-2">
          <SearchPanel
            isSearching={isSearching}
            eloRange={eloRange}
            onlineCount={onlineCount}
            cooldownRemainingMs={cooldownRemainingMs}
            error={error}
            onCancel={() => {
              cancel();
              router.push('/');
            }}
          />
        </div>
      </div>

      {/* Resume-search button when search has stopped but user still on page */}
      {!isSearching && cooldownRemainingMs === 0 && !showModal && (
        <div className="mt-7 flex justify-center">
          <button
            onClick={() => findMatch()}
            className="px-8 py-4 bg-accent text-on-accent text-[12px] font-black tracking-[2.5px] rounded-md hover:scale-[1.02] transition-all shadow-[0_4px_24px_var(--accent-glow)]"
          >
            ▸ RESUME SEARCH
          </button>
        </div>
      )}

      {/* Match found modal — blocking overlay.
          key={matchId} forces a remount whenever matchId changes so the
          countdown state resets cleanly (avoids set-state-in-effect). */}
      {showModal && pendingMatch && user && (
        <MatchFoundModal
          key={pendingMatch.id}
          matchId={pendingMatch.id}
          userId={user.id}
          player1Id={pendingMatch.player1_id}
          player2Id={pendingMatch.player2_id}
          alreadyAccepted={selfAccepted}
          onAccept={acceptMatch}
          onDeclineOrTimeout={(reason) => declineMatch(reason)}
        />
      )}
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-ink-muted">Loading…</div>
        </div>
      }
    >
      <PlayContent />
    </Suspense>
  );
}
