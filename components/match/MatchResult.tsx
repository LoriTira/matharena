'use client';

import Link from 'next/link';

interface MatchResultProps {
  won: boolean;
  myScore: number;
  theirScore: number;
  targetScore: number;
  eloBefore: number;
  eloAfter: number;
  penalties: number;
  opponentName: string;
}

export function MatchResult({
  won,
  myScore,
  theirScore,
  targetScore,
  eloBefore,
  eloAfter,
  penalties,
  opponentName,
}: MatchResultProps) {
  const eloChange = eloAfter - eloBefore;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className={`font-serif text-5xl font-light ${won ? 'text-white/90' : 'text-white/40'}`}>
        {won ? 'Victory' : 'Defeat'}
      </div>

      <div className="text-[13px] text-white/30">
        vs {opponentName}
      </div>

      <div className="font-mono text-3xl font-medium text-white/80 tabular-nums">
        {myScore} &ndash; {theirScore}
        <span className="text-white/20 text-lg ml-2">/ {targetScore}</span>
      </div>

      <div className={`font-mono text-2xl font-medium tabular-nums ${eloChange >= 0 ? 'text-white/70' : 'text-white/30'}`}>
        {eloChange >= 0 ? '+' : ''}{eloChange} Elo
      </div>

      <div className="text-white/25 text-sm font-mono tabular-nums">
        {eloBefore} &rarr; {eloAfter}
      </div>

      {penalties > 0 && (
        <div className="text-white/20 text-xs">
          {penalties} wrong {penalties === 1 ? 'answer' : 'answers'}
        </div>
      )}

      <div className="flex gap-4 mt-4">
        <Link
          href="/play"
          className="px-8 py-3 bg-white/90 text-[#050505] font-semibold text-xs tracking-[1.5px] rounded-sm transition-colors hover:bg-white"
        >
          PLAY AGAIN
        </Link>
        <Link
          href="/dashboard"
          className="px-8 py-3 border border-white/[0.12] text-white/50 text-xs tracking-[1.5px] rounded-sm transition-colors hover:border-white/25 hover:text-white/70"
        >
          DASHBOARD
        </Link>
      </div>
    </div>
  );
}
