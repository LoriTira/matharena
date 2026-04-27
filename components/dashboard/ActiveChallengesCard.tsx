'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import type { Challenge } from '@/types';

type ChallengeProfile = {
  username: string;
  display_name: string | null;
};

interface ActiveChallengesCardProps {
  receivedPending: Challenge[];
  sentAccepted: Challenge[];
  receivedAccepted: Challenge[];
  sentPending: Challenge[];
  challengeProfiles: Record<string, ChallengeProfile>;
  currentUserId: string | null | undefined;
  onAccept: (code: string) => void;
  onDecline: (code: string) => void;
}

export function ActiveChallengesCard({
  receivedPending,
  sentAccepted,
  receivedAccepted,
  sentPending,
  challengeProfiles,
  currentUserId,
  onAccept,
  onDecline,
}: ActiveChallengesCardProps) {
  const total = receivedPending.length + sentAccepted.length + receivedAccepted.length + sentPending.length;
  if (total === 0) return null;

  const opponentName = (challenge: Challenge) => {
    const opponentId = challenge.sender_id === currentUserId ? challenge.recipient_id : challenge.sender_id;
    if (!opponentId) return null;
    const p = challengeProfiles[opponentId];
    return p ? p.display_name || p.username : null;
  };

  return (
    <Card variant="default" className="p-6">
      <div className="text-[11px] tracking-[2px] text-ink-faint mb-4">ACTIVE CHALLENGES</div>
      <div className="space-y-2.5">
        {receivedPending.map((challenge) => {
          const name = opponentName(challenge);
          return (
            <div
              key={challenge.id}
              className="flex items-center justify-between p-3 rounded-sm bg-card border border-edge-faint"
            >
              <div>
                <div className="text-[12px] text-ink-secondary">
                  {name ? `${name} challenged you` : 'You received a challenge'}
                </div>
                <div className="text-[12px] text-ink-faint mt-0.5">Accept to start</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onAccept(challenge.code)}
                  className="px-3 py-1 bg-btn text-btn-text text-[11px] tracking-[1px] font-semibold rounded-sm hover:bg-btn-hover transition-colors"
                >
                  ACCEPT
                </button>
                <button
                  onClick={() => onDecline(challenge.code)}
                  className="px-2 py-1 border border-edge text-ink-muted text-[11px] rounded-sm hover:border-edge-strong hover:text-ink-tertiary transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}

        {sentAccepted.map((challenge) => {
          const name = opponentName(challenge);
          return (
            <div
              key={challenge.id}
              className="flex items-center justify-between p-3 rounded-sm bg-card border border-accent/30"
            >
              <div>
                <div className="text-[12px] text-ink-secondary">
                  {name ? `${name} accepted` : 'Challenge accepted'}
                </div>
                <div className="text-[12px] text-accent/70 mt-0.5">Ready to play</div>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/challenge/${challenge.code}/lobby`}
                  className="px-4 py-1.5 bg-accent text-on-accent text-[11px] tracking-[1px] font-semibold rounded-sm hover:bg-accent/90 transition-colors"
                >
                  PLAY
                </Link>
                <button
                  onClick={() => onDecline(challenge.code)}
                  className="px-2 py-1 border border-edge text-ink-muted text-[11px] rounded-sm hover:border-edge-strong hover:text-ink-tertiary transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}

        {receivedAccepted.map((challenge) => {
          const name = opponentName(challenge);
          return (
            <div
              key={challenge.id}
              className="flex items-center justify-between p-3 rounded-sm bg-card border border-accent/30"
            >
              <div>
                <div className="text-[12px] text-ink-secondary">
                  {name ? `Match vs ${name}` : 'Challenge accepted'}
                </div>
                <div className="text-[12px] text-accent/70 mt-0.5">Ready to play</div>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/challenge/${challenge.code}/lobby`}
                  className="px-4 py-1.5 bg-accent text-on-accent text-[11px] tracking-[1px] font-semibold rounded-sm hover:bg-accent/90 transition-colors"
                >
                  PLAY
                </Link>
                <button
                  onClick={() => onDecline(challenge.code)}
                  className="px-2 py-1 border border-edge text-ink-muted text-[11px] rounded-sm hover:border-edge-strong hover:text-ink-tertiary transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}

        {sentPending.map((challenge) => (
          <div
            key={challenge.id}
            className="flex items-center justify-between p-3 rounded-sm bg-card border border-edge-faint"
          >
            <div>
              <div className="text-[12px] text-ink-tertiary">Waiting for opponent</div>
              <div className="font-mono text-[12px] text-ink-faint mt-0.5 truncate max-w-[180px]">
                /challenge/{challenge.code}
              </div>
            </div>
            <button
              onClick={() => onDecline(challenge.code)}
              className="px-2 py-1 border border-edge text-ink-faint text-[12px] rounded-sm hover:border-edge-strong hover:text-ink-tertiary transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
