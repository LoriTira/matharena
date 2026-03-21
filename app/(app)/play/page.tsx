'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMatchmaking } from '@/hooks/useMatchmaking';

function PlayContent() {
  const { isSearching, error, findMatch, cancel } = useMatchmaking();
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
      <h1 className="font-serif text-4xl font-light text-white/90">Ranked Match</h1>
      <p className="text-white/35 text-[15px] max-w-md text-center leading-relaxed font-light">
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
          <div className="w-12 h-12 border border-white/20 border-t-white/60 rounded-full animate-spin" />
          <p className="text-white/40 text-[15px]">Finding an opponent...</p>
          <button
            onClick={cancel}
            className="px-6 py-2 text-[10px] tracking-[1.5px] text-white/30 border border-white/[0.08] hover:border-white/20 hover:text-white/50 rounded-sm transition-colors"
          >
            CANCEL
          </button>
        </div>
      ) : (
        <button
          onClick={findMatch}
          className="px-12 py-4 bg-white/90 text-[#050505] text-sm font-semibold tracking-[1.5px] rounded-sm transition-colors hover:bg-white"
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
        <div className="text-white/25">Loading...</div>
      </div>
    }>
      <PlayContent />
    </Suspense>
  );
}
