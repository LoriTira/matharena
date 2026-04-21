'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { GAME_CONFIG } from '@/lib/constants';
import { useSound } from '@/hooks/useSound';
import type { Profile } from '@/types';

interface MatchFoundModalProps {
  /** ID of the pending_accept match. Component fetches opponent details. */
  matchId: string;
  /** Current user's ID so we can pick the opponent side. */
  userId: string;
  /** Player 1 ID from the match row. */
  player1Id: string;
  /** Player 2 ID from the match row. */
  player2Id: string | null;
  /** Callback when the user taps ACCEPT. */
  onAccept: () => void;
  /** Callback when the user taps DECLINE or the timer runs out. */
  onDeclineOrTimeout: (reason: 'declined' | 'timeout') => void;
  /** Whether this user has already accepted (waiting on opponent). */
  alreadyAccepted: boolean;
}

/**
 * The chess.com-style "match found" modal that appears when matchmaking
 * transitions to `pending_accept`. Pauses warmup, shows opponent info,
 * counts down 10 seconds for accept decision.
 *
 * Visual goal: UNMISTAKABLY different from the warmup panel. Uses the accent
 * color, big opponent card, and blocking overlay — the exact opposite of the
 * warmup's muted palette.
 */
export function MatchFoundModal({
  matchId,
  userId,
  player1Id,
  player2Id,
  onAccept,
  onDeclineOrTimeout,
  alreadyAccepted,
}: MatchFoundModalProps) {
  const { unlock } = useSound();
  const [opponent, setOpponent] = useState<Profile | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(GAME_CONFIG.MATCH_ACCEPT_TIMEOUT_MS);
  const [timedOut, setTimedOut] = useState(false);

  // Tap/click/enter on ACCEPT is the canonical user gesture that unlocks the
  // iOS AudioContext for the rest of the session. Fire-and-forget — we never
  // block the accept on audio resolving, and if unlock fails the match still
  // plays silently.
  const handleAccept = () => {
    unlock();
    onAccept();
  };

  // Fetch opponent profile once the match id is known.
  useEffect(() => {
    const opponentId = player1Id === userId ? player2Id : player1Id;
    if (!opponentId) return;

    let cancelled = false;
    const supabase = createClient();
    supabase
      .from('profiles')
      .select('*')
      .eq('id', opponentId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) setOpponent(data as Profile);
      });

    return () => {
      cancelled = true;
    };
  }, [matchId, userId, player1Id, player2Id]);

  // Countdown timer — fires onDeclineOrTimeout('timeout') at 0.
  // The parent uses key={matchId} to force remount on match change, so the
  // initial useState value handles the "reset on matchId change" case.
  useEffect(() => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const left = Math.max(0, GAME_CONFIG.MATCH_ACCEPT_TIMEOUT_MS - elapsed);
      setRemainingMs(left);
      if (left <= 0) {
        clearInterval(interval);
        setTimedOut(true);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Fire the timeout callback once (separate from the interval to avoid
  // calling parent handlers inside setInterval tick closures).
  // IMPORTANT: if this client has already accepted, do NOT fire the timeout.
  // The timer running out here just means the opponent didn't accept in time;
  // this client is innocent and the server-side decline flow (triggered by
  // the opponent or by the stale sweep) will abandon the match and Realtime
  // will unmount this modal naturally. Firing onDeclineOrTimeout would
  // trigger an unwarranted client-side cooldown for the accepter.
  useEffect(() => {
    if (timedOut && !alreadyAccepted) onDeclineOrTimeout('timeout');
  }, [timedOut, alreadyAccepted, onDeclineOrTimeout]);

  // Keyboard shortcut: Enter = accept. Also unlocks audio (Enter counts as a
  // user gesture, so iOS accepts it as the unlock trigger).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (alreadyAccepted) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        unlock();
        onAccept();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAccept, alreadyAccepted, unlock]);

  const seconds = Math.ceil(remainingMs / 1000);
  const progress = remainingMs / GAME_CONFIG.MATCH_ACCEPT_TIMEOUT_MS;
  const opponentName = opponent?.username ?? 'Loading…';
  const opponentElo = opponent?.elo_rating;

  return (
    <AnimatePresence>
      <motion.div
        key="match-found-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-scrim backdrop-blur-sm px-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-found-title"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full max-w-md bg-panel border border-accent/30 rounded-sm shadow-2xl overflow-hidden"
        >
          {/* Header — distinctly accented so it can't be mistaken for the warmup */}
          <div className="flex items-center justify-center gap-2 py-4 border-b border-edge-faint bg-accent-subtle">
            <span className="text-xl">🏆</span>
            <h2
              id="match-found-title"
              className="font-serif text-xl text-ink tracking-wide"
            >
              MATCH FOUND
            </h2>
          </div>

          {/* Opponent card */}
          <div className="flex flex-col items-center gap-3 px-6 py-8">
            <div className="w-16 h-16 rounded-full bg-inset border border-edge flex items-center justify-center overflow-hidden">
              {opponent?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={opponent.avatar_url}
                  alt={opponentName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl text-ink-muted font-serif">
                  {opponentName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="text-lg font-medium text-ink">{opponentName}</div>
              {opponentElo !== undefined && (
                <div className="text-[11px] tracking-[1.5px] text-ink-muted font-mono">
                  ELO {opponentElo}
                </div>
              )}
            </div>

            {alreadyAccepted && (
              <div className="text-[11px] text-ink-tertiary mt-1 tracking-wide">
                Waiting for opponent to accept…
              </div>
            )}
          </div>

          {/* Accept button with integrated countdown */}
          <div className="px-6 pb-6 flex flex-col gap-3">
            <button
              onClick={handleAccept}
              disabled={alreadyAccepted}
              className="relative w-full bg-btn text-btn-text font-semibold tracking-[1.5px] py-4 rounded-sm overflow-hidden transition-opacity disabled:opacity-60 hover:bg-btn-hover"
              aria-label="Accept match"
            >
              {/* Countdown progress bar across the bottom of the button */}
              <div
                className="absolute bottom-0 left-0 h-0.5 bg-accent transition-[width] duration-100 ease-linear"
                style={{ width: `${progress * 100}%` }}
              />
              <span className="relative">
                {alreadyAccepted ? 'ACCEPTED' : `ACCEPT · ${seconds}s`}
              </span>
            </button>

            <button
              onClick={() => onDeclineOrTimeout('declined')}
              disabled={alreadyAccepted}
              className="py-3 px-6 text-[11px] tracking-[1.5px] text-ink-muted hover:text-ink-tertiary transition-colors disabled:opacity-30"
            >
              Decline ({Math.round(GAME_CONFIG.MATCH_DECLINE_COOLDOWN_MS / 1000)}s cooldown)
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
