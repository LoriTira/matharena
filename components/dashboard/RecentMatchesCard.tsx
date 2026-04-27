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
    <Card variant="default" className="p-6">
      <div className="text-[11px] tracking-[2px] text-ink-faint mb-4">RECENT MATCHES</div>
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
                <div className="flex items-center gap-2.5">
                  <span
                    className={`font-mono text-[11px] tracking-[1px] px-1.5 py-0.5 rounded-sm ${
                      won ? 'text-ink-secondary bg-shade' : 'text-ink-muted bg-card'
                    }`}
                  >
                    {won ? 'W' : 'L'}
                  </span>
                  <span className="text-[12px] text-ink-secondary">vs {opponentName}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[11px] text-ink-muted tabular-nums">
                    {myScore}&ndash;{theirScore}
                  </span>
                  <span
                    className={`font-mono text-[12px] tabular-nums w-10 text-right ${
                      eloChange >= 0 ? 'text-ink-secondary' : 'text-ink-faint'
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
