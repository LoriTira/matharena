'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Match } from '@/types';

interface RecentMatchesCardProps {
  matches: Match[];
  opponentNames: Record<string, string>;
  currentUserId: string | null | undefined;
  loaded: boolean;
}

export function RecentMatchesCard({
  matches,
  opponentNames,
  currentUserId,
  loaded,
}: RecentMatchesCardProps) {
  return (
    <Card variant="default" className="p-6 rounded-xl border-2 border-edge-strong">
      <div className="text-[12px] tracking-[3px] font-black text-ink-tertiary mb-5">
        ▸ RECENT MATCHES
      </div>
      {!loaded ? (
        <div className="space-y-3">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
      ) : matches.length > 0 ? (
        <div className="space-y-0 -mx-1">
          {matches.map((match) => {
            const isPlayer1 = match.player1_id === currentUserId;
            const won = match.winner_id === currentUserId;
            const myScore = isPlayer1 ? match.player1_score : match.player2_score;
            const theirScore = isPlayer1 ? match.player2_score : match.player1_score;
            const eloChange = isPlayer1
              ? (match.player1_elo_after ?? 0) - (match.player1_elo_before ?? 0)
              : (match.player2_elo_after ?? 0) - (match.player2_elo_before ?? 0);
            const opponentId = isPlayer1 ? match.player2_id : match.player1_id;
            const opponentName = opponentId ? opponentNames[opponentId] ?? 'Opponent' : 'Opponent';

            return (
              <Link
                key={match.id}
                href={`/play/${match.id}/analysis`}
                className="flex items-center justify-between py-2.5 border-b border-edge-faint last:border-b-0 hover:bg-card transition-colors -mx-1 px-2 rounded-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono text-[12px] font-black tracking-wider px-2 py-1 rounded-md ${
                      won
                        ? 'text-feedback-correct bg-feedback-correct/10 border border-feedback-correct/30'
                        : 'text-feedback-wrong bg-feedback-wrong/10 border border-feedback-wrong/30'
                    }`}
                  >
                    {won ? 'W' : 'L'}
                  </span>
                  <span className="text-[13px] font-semibold text-ink-secondary">vs {opponentName}</span>
                </div>
                <div className="flex items-center gap-5">
                  <span className="font-mono text-[12px] font-bold text-ink-tertiary tabular-nums">
                    {myScore}&ndash;{theirScore}
                  </span>
                  <span
                    className={`font-mono text-[13px] font-black tabular-nums w-12 text-right ${
                      eloChange >= 0 ? 'text-feedback-correct' : 'text-feedback-wrong'
                    }`}
                  >
                    {eloChange >= 0 ? '+' : ''}
                    {eloChange}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-[12px] text-ink-faint py-4">
          No matches played yet. Start a ranked match!
        </div>
      )}
    </Card>
  );
}
