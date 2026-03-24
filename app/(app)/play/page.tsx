'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMatchmaking } from '@/hooks/useMatchmaking';
import { GAME_CONFIG } from '@/lib/constants';

function PlayContent() {
  const { isSearching, error, eloRange, findMatch, cancel } = useMatchmaking();
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasAutoSearched = useRef(false);

  useEffect(() => {
    if (
      searchParams.get('autoSearch') === 'true' &&
      !hasAutoSearched.current &&
      !isSearching
    ) {
      hasAutoSearched.current = true;
      router.replace('/play');
      findMatch();
    }
  }, [searchParams, findMatch, isSearching, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <h1 className="font-serif text-4xl font-normal text-ink">Ranked Match</h1>
      <p className="text-ink-tertiary text-[15px] max-w-md text-center leading-relaxed font-normal">
        Compete head-to-head against another player. First to solve 5 problems wins.
        Your Elo rating is on the line.
      </p>

      {error && (
        <div className="text-red-400/70 bg-red-400/5 border border-red-400/10 rounded-sm px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {isSearching ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border border-edge-strong border-t-ink-secondary rounded-full animate-spin" />
          <p className="text-ink-tertiary text-[15px]">Finding an opponent...</p>
          {eloRange > GAME_CONFIG.MATCHMAKING_ELO_RANGE_INITIAL && (
            <p className="text-ink-faint text-[12px] font-mono tabular-nums">
              Widening search range&hellip; &plusmn;{eloRange} Elo
            </p>
          )}
          <button
            onClick={cancel}
            className="px-6 py-2 text-[12px] tracking-[1.5px] text-ink-muted border border-edge hover:border-edge-strong hover:text-ink-secondary rounded-sm transition-colors"
          >
            CANCEL
          </button>
        </div>
      ) : (
        <button
          onClick={findMatch}
          className="px-12 py-4 bg-btn text-btn-text text-sm font-semibold tracking-[1.5px] rounded-sm transition-colors hover:bg-btn-hover"
        >
          FIND MATCH
        </button>
      )}
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-ink-muted">Loading...</div>
      </div>
    }>
      <PlayContent />
    </Suspense>
  );
}
