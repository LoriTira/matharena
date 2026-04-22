'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Problem, MatchEvent } from '@/types';

interface MatchDetailModalProps {
  matchId: string | null;
  /** Whose perspective the breakdown is oriented around (the profile owner). */
  viewerId: string;
  /** Optional label for the "viewer" column. Defaults to "YOU". */
  viewerLabel?: string;
  onClose: () => void;
}

interface MatchDetail {
  id: string;
  player1_id: string;
  player2_id: string | null;
  player1_score: number;
  player2_score: number;
  player1_penalties: number;
  player2_penalties: number;
  winner_id: string | null;
  problems: Problem[];
  target_score: number;
  completed_at: string | null;
  status: string;
}

function formatProblem(p: Problem | undefined): string {
  if (!p) return '';
  return `${p.operand1} ${p.operation} ${p.operand2}`;
}

/**
 * Read-only per-problem breakdown for a completed match. Framer Motion +
 * AnimatePresence, same overlay pattern as MatchFoundModal — but read-only
 * and without the countdown.
 */
export function MatchDetailModal({
  matchId,
  viewerId,
  viewerLabel = 'YOU',
  onClose,
}: MatchDetailModalProps) {
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    setLoading(true);
    setMatch(null);
    setEvents([]);
    let cancelled = false;

    fetch(`/api/matches/${matchId}/events`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setMatch(data.match as MatchDetail);
          setEvents((data.events ?? []) as MatchEvent[]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  // Esc to close
  useEffect(() => {
    if (!matchId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [matchId, onClose]);

  // Group events by problem_index, separated by player.
  const rowsByIndex = new Map<number, { viewer?: MatchEvent; opponent?: MatchEvent }>();
  if (match) {
    for (const ev of events) {
      const bucket = rowsByIndex.get(ev.problem_index) ?? {};
      if (ev.player_id === viewerId) bucket.viewer = ev;
      else bucket.opponent = ev;
      rowsByIndex.set(ev.problem_index, bucket);
    }
  }
  const problemIndices = Array.from(rowsByIndex.keys()).sort((a, b) => a - b);

  return (
    <AnimatePresence>
      {matchId && (
        <motion.div
          key="match-detail-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-scrim backdrop-blur-sm px-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[85vh] bg-panel border border-edge rounded-sm shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-edge-faint">
              <h2 className="font-serif text-lg text-ink">Match breakdown</h2>
              <button
                onClick={onClose}
                className="text-ink-faint hover:text-ink-secondary transition-colors text-lg leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {loading || !match ? (
                <div className="p-6 text-center text-ink-faint text-[12px]">
                  Loading…
                </div>
              ) : (
                <>
                  {/* Header stats */}
                  <div className="grid grid-cols-2 gap-px bg-shade">
                    <ScoreCell
                      label={viewerLabel}
                      score={match.player1_id === viewerId ? match.player1_score : match.player2_score}
                    />
                    <ScoreCell
                      label="OPPONENT"
                      score={match.player1_id === viewerId ? match.player2_score : match.player1_score}
                    />
                  </div>

                  {/* Per-problem rows */}
                  <div className="divide-y divide-edge-faint">
                    {problemIndices.length === 0 ? (
                      <div className="p-6 text-center text-ink-faint text-[12px]">
                        No events recorded
                      </div>
                    ) : (
                      problemIndices.map((idx) => {
                        const bucket = rowsByIndex.get(idx)!;
                        const problem = match.problems[idx];
                        return (
                          <div key={idx} className="flex items-center gap-4 px-6 py-3">
                            <div className="text-[11px] font-mono text-ink-faint tabular-nums w-6">
                              {idx + 1}
                            </div>
                            <div className="text-[13px] font-mono text-ink-secondary flex-1 tabular-nums">
                              {formatProblem(problem)}
                              {problem ? ` = ${problem.answer}` : ''}
                            </div>
                            <EventCell ev={bucket.viewer} />
                            <EventCell ev={bucket.opponent} />
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ScoreCell({ label, score }: { label: string; score: number }) {
  return (
    <div className="bg-page p-5 text-center">
      <div className="text-[11px] tracking-[2px] text-ink-faint mb-2">{label}</div>
      <div className="font-mono text-3xl text-ink tabular-nums">{score}</div>
    </div>
  );
}

function EventCell({ ev }: { ev: MatchEvent | undefined }) {
  if (!ev) {
    return (
      <div className="w-20 text-right text-[11px] text-ink-faint font-mono tabular-nums">—</div>
    );
  }
  const correct = ev.event === 'answer_correct';
  const mark = correct ? '✓' : '✗';
  const markClass = correct ? 'text-feedback-correct' : 'text-feedback-wrong';
  return (
    <div className="w-20 text-right text-[11px] font-mono tabular-nums flex items-center justify-end gap-1.5">
      <span className={markClass}>{mark}</span>
      <span className="text-ink-faint">{(ev.elapsed_ms / 1000).toFixed(1)}s</span>
    </div>
  );
}
