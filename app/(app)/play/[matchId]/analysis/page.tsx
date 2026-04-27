'use client';

import { useEffect, useState, useMemo } from 'react';
import { use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';
import { RankBadge } from '@/components/ui/RankBadge';
import type { Match, MatchEvent, Profile } from '@/types';

interface Problem {
  operand1: number;
  operand2: number;
  operation: string;
  answer: number;
}

function formatOp(op: string) {
  if (op === '*') return '\u00D7';
  if (op === '/') return '\u00F7';
  return op;
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MatchAnalysisPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [match, setMatch] = useState<Match | null>(null);
  const [myEvents, setMyEvents] = useState<MatchEvent[]>([]);
  const [opponentEvents, setOpponentEvents] = useState<MatchEvent[]>([]);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [opponentProfile, setOpponentProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchAnalysis = async () => {
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError || !matchData) {
        setError('Match not found');
        setLoading(false);
        return;
      }

      const m = matchData as Match;

      if (m.player1_id !== user.id && m.player2_id !== user.id) {
        setError('You are not a participant in this match');
        setLoading(false);
        return;
      }

      if (m.status !== 'completed' && m.status !== 'abandoned') {
        setError('Match is still in progress');
        setLoading(false);
        return;
      }

      setMatch(m);

      const opponentId = m.player1_id === user.id ? m.player2_id : m.player1_id;

      // Fetch all events for both players
      const { data: events } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (events) {
        const typed = events as MatchEvent[];
        setMyEvents(typed.filter(e => e.player_id === user.id));
        setOpponentEvents(typed.filter(e => e.player_id === opponentId));
      }

      // Fetch profiles
      const { data: mp } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (mp) setMyProfile(mp as Profile);

      if (opponentId) {
        const { data: op } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', opponentId)
          .single();
        if (op) setOpponentProfile(op as Profile);
      }

      setLoading(false);
    };

    fetchAnalysis();
  }, [matchId, user, authLoading, supabase]);

  if (loading || authLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-red-400/60 text-sm">{error}</div>
        <Link
          href="/dashboard"
          className="px-6 py-2.5 border border-edge text-ink-tertiary text-[12px] tracking-[1.5px] rounded-sm hover:border-edge-strong hover:text-ink-secondary transition-colors"
        >
          DASHBOARD
        </Link>
      </div>
    );
  }

  if (!match || !user) return null;

  const problems = match.problems as Problem[];
  const isPlayer1 = match.player1_id === user.id;
  const won = match.winner_id === user.id;
  const myScore = isPlayer1 ? match.player1_score : match.player2_score;
  const theirScore = isPlayer1 ? match.player2_score : match.player1_score;
  const eloChange = isPlayer1
    ? (match.player1_elo_after ?? 0) - (match.player1_elo_before ?? 0)
    : (match.player2_elo_after ?? 0) - (match.player2_elo_before ?? 0);
  const myName = myProfile?.display_name || myProfile?.username || 'You';
  const opponentName = opponentProfile?.display_name || opponentProfile?.username || 'Opponent';

  // Build per-problem analysis
  const problemAnalysis = problems.map((problem, idx) => {
    const myAttempts = myEvents.filter(e => e.problem_index === idx);
    const opAttempts = opponentEvents.filter(e => e.problem_index === idx);
    const myCorrect = myAttempts.find(e => e.event === 'answer_correct');
    const opCorrect = opAttempts.find(e => e.event === 'answer_correct');
    const myWrong = myAttempts.filter(e => e.event === 'answer_wrong');
    const opWrong = opAttempts.filter(e => e.event === 'answer_wrong');

    // Solve time relative to previous correct answer
    const myPrevCorrect = myEvents
      .filter(e => e.event === 'answer_correct' && e.problem_index < idx)
      .sort((a, b) => b.elapsed_ms - a.elapsed_ms)[0];
    const mySolveMs = myCorrect
      ? myCorrect.elapsed_ms - (myPrevCorrect?.elapsed_ms ?? 0)
      : null;

    const opPrevCorrect = opponentEvents
      .filter(e => e.event === 'answer_correct' && e.problem_index < idx)
      .sort((a, b) => b.elapsed_ms - a.elapsed_ms)[0];
    const opSolveMs = opCorrect
      ? opCorrect.elapsed_ms - (opPrevCorrect?.elapsed_ms ?? 0)
      : null;

    return {
      problem,
      index: idx,
      myCorrect,
      myWrong,
      mySolveMs,
      opCorrect,
      opWrong,
      opSolveMs,
    };
  });

  // Only show problems that were actually attempted by at least one player
  const attemptedProblems = problemAnalysis.filter(
    p => p.myCorrect || p.myWrong.length > 0 || p.opCorrect || p.opWrong.length > 0
  );

  return (
    <div className="max-w-3xl mx-auto space-y-7">
      {/* Header */}
      <div>
        <Link
          href={`/play/${matchId}`}
          className="text-[12px] font-bold text-ink-tertiary hover:text-accent transition-colors"
        >
          &larr; Back to results
        </Link>
        <div className="text-[11px] tracking-[4px] font-black text-accent mt-3 mb-1">▸ ANALYSIS</div>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-black text-ink leading-none tracking-tight">
          Game breakdown.
        </h1>
      </div>

      {/* Match summary */}
      <div className="border-2 border-edge-strong bg-panel rounded-xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className={`font-serif text-2xl sm:text-3xl font-black tracking-tight ${won ? 'text-feedback-correct' : 'text-feedback-wrong'}`}>
              {won ? 'Victory.' : 'Defeat.'}
            </span>
            <span className="font-mono text-2xl font-black text-ink tabular-nums">
              {myScore}&ndash;{theirScore}
            </span>
          </div>
          <span className={`font-mono text-base font-black tabular-nums px-3 py-1 rounded-md border-2 ${
            eloChange >= 0
              ? 'text-feedback-correct border-feedback-correct/40 bg-feedback-correct/10'
              : 'text-feedback-wrong border-feedback-wrong/40 bg-feedback-wrong/10'
          }`}>
            {eloChange >= 0 ? '+' : ''}{eloChange} Elo
          </span>
        </div>

        <div className="flex items-center justify-between text-[13px] font-bold">
          <div className="flex items-center gap-2">
            <span className="text-ink">{myName}</span>
            {myProfile && <RankBadge elo={myProfile.elo_rating} size="sm" />}
          </div>
          <span className="text-ink-faint font-serif italic">vs</span>
          <div className="flex items-center gap-2">
            {opponentProfile && <RankBadge elo={opponentProfile.elo_rating} size="sm" />}
            <span className="text-ink">{opponentName}</span>
          </div>
        </div>
      </div>

      {/* Problem-by-problem breakdown */}
      <div className="space-y-3">
        <div className="text-[11px] tracking-[3px] font-black text-accent">▸ PROBLEM BREAKDOWN</div>

        {attemptedProblems.map(({ problem, index, myCorrect, myWrong, mySolveMs, opCorrect, opWrong, opSolveMs }) => (
          <div key={index} className="border-2 border-edge-strong rounded-xl overflow-hidden bg-panel">
            {/* Problem header */}
            <div className="flex items-center justify-between px-4 py-3 bg-shade border-b-2 border-edge-strong">
              <div className="flex items-center gap-3">
                <span className="text-[11px] tracking-[2px] font-black text-ink-tertiary font-mono">#{index + 1}</span>
                <span className="font-mono text-lg font-black text-ink">
                  {problem.operand1} <span className="text-accent">{formatOp(problem.operation)}</span> {problem.operand2}
                </span>
              </div>
              <span className="font-mono text-base font-black text-ink-secondary">= <span className="text-accent">{problem.answer}</span></span>
            </div>

            {/* Player results */}
            <div className="grid grid-cols-2 divide-x-2 divide-edge-strong">
              {/* Your result */}
              <div className="px-4 py-3 space-y-1.5">
                <div className="text-[10px] tracking-[2px] font-black text-ink-tertiary">YOU</div>
                {myCorrect ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-feedback-correct text-[12px] font-black">✓ Correct</span>
                      <span className="font-mono text-[12px] font-bold text-ink-secondary tabular-nums">
                        {myCorrect.submitted_answer}
                      </span>
                    </div>
                    {mySolveMs !== null && (
                      <div className="text-[12px] text-ink-tertiary font-mono font-bold tabular-nums">
                        {formatTime(mySolveMs)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[12px] text-ink-faint font-semibold">Not solved</div>
                )}
                {myWrong.length > 0 && (
                  <div className="space-y-0.5">
                    {myWrong.map((w, i) => (
                      <div key={i} className="flex items-center gap-2 text-[12px]">
                        <span className="text-feedback-wrong font-black">✕ Wrong</span>
                        <span className="font-mono text-ink-faint line-through tabular-nums">
                          {w.submitted_answer}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Opponent result */}
              <div className="px-4 py-3 space-y-1.5">
                <div className="text-[10px] tracking-[2px] font-black text-ink-tertiary">{opponentName.toUpperCase()}</div>
                {opCorrect ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-feedback-correct text-[12px] font-black">✓ Correct</span>
                      <span className="font-mono text-[12px] font-bold text-ink-secondary tabular-nums">
                        {opCorrect.submitted_answer}
                      </span>
                    </div>
                    {opSolveMs !== null && (
                      <div className="text-[12px] text-ink-tertiary font-mono font-bold tabular-nums">
                        {formatTime(opSolveMs)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[12px] text-ink-faint font-semibold">Not solved</div>
                )}
                {opWrong.length > 0 && (
                  <div className="space-y-0.5">
                    {opWrong.map((w, i) => (
                      <div key={i} className="flex items-center gap-2 text-[12px]">
                        <span className="text-feedback-wrong font-black">✕ Wrong</span>
                        <span className="font-mono text-ink-faint line-through tabular-nums">
                          {w.submitted_answer}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Back link */}
      <div className="flex items-center gap-3 pt-2 pb-8 flex-wrap">
        <Link
          href="/"
          className="px-5 py-3 border-2 border-edge-strong text-ink font-black text-[12px] tracking-[2.5px] rounded-md transition-colors hover:border-edge-bold hover:bg-shade"
        >
          DASHBOARD
        </Link>
        <Link
          href="/play"
          className="px-5 py-3 bg-accent text-on-accent font-black text-[12px] tracking-[2.5px] rounded-md transition-all hover:scale-[1.02] shadow-[0_4px_20px_var(--accent-glow)]"
        >
          ▸ PLAY AGAIN
        </Link>
      </div>
    </div>
  );
}
