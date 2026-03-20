'use client';

interface ScoreBarProps {
  player1Score: number;
  player2Score: number;
  targetScore: number;
  player1Name: string;
  player2Name: string;
  currentPlayerId: string;
  player1Id: string;
}

export function ScoreBar({
  player1Score,
  player2Score,
  targetScore,
  player1Name,
  player2Name,
  currentPlayerId,
  player1Id,
}: ScoreBarProps) {
  const isPlayer1 = currentPlayerId === player1Id;
  const myScore = isPlayer1 ? player1Score : player2Score;
  const theirScore = isPlayer1 ? player2Score : player1Score;
  const myName = isPlayer1 ? player1Name : player2Name;
  const theirName = isPlayer1 ? player2Name : player1Name;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      {/* My score */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] tracking-[1px] text-white/40 w-24 truncate">{myName} (You)</span>
        <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-white/60 rounded-full transition-all duration-500"
            style={{ width: `${(myScore / targetScore) * 100}%` }}
          />
        </div>
        <span className="font-mono text-lg font-medium text-white/90 w-10 text-right tabular-nums">{myScore}</span>
      </div>

      {/* Their score */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] tracking-[1px] text-white/25 w-24 truncate">{theirName}</span>
        <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-white/20 rounded-full transition-all duration-500"
            style={{ width: `${(theirScore / targetScore) * 100}%` }}
          />
        </div>
        <span className="font-mono text-lg font-medium text-white/50 w-10 text-right tabular-nums">{theirScore}</span>
      </div>

      <div className="text-center text-[9px] tracking-[2px] text-white/20">FIRST TO {targetScore}</div>
    </div>
  );
}
