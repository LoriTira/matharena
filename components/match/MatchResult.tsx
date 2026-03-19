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
      <div className={`text-6xl font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>
        {won ? 'Victory!' : 'Defeat'}
      </div>

      <div className="text-xl text-gray-300">
        vs {opponentName}
      </div>

      <div className="text-3xl font-bold text-white">
        {myScore} - {theirScore}
        <span className="text-gray-500 text-lg ml-2">/ {targetScore}</span>
      </div>

      <div className={`text-2xl font-bold ${eloChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {eloChange >= 0 ? '+' : ''}{eloChange} Elo
      </div>

      <div className="text-gray-400">
        Rating: {eloBefore} → {eloAfter}
      </div>

      {penalties > 0 && (
        <div className="text-gray-500 text-sm">
          {penalties} wrong {penalties === 1 ? 'answer' : 'answers'}
        </div>
      )}

      <div className="flex gap-4 mt-4">
        <Link
          href="/play"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
        >
          Play Again
        </Link>
        <Link
          href="/dashboard"
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
