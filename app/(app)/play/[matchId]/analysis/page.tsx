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
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="text-[12px] text-ink-faint hover:text-ink-tertiary transition-colors"
        >
          &larr; Dashboard
        </Link>
        <h1 className="font-serif text-2xl text-ink mt-2">Game Analysis</h1>
      </div>

      {/* Match summary */}
      <div className="border border-edge rounded-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`font-serif text-lg ${won ? 'text-accent' : 'text-ink-tertiary'}`}>
              {won ? 'Victory' : 'Defeat'}
            </span>
            <span className="font-mono text-lg text-ink tabular-nums">
              {myScore}&ndash;{theirScore}
            </span>
          </div>
          <span className={`font-mono text-sm tabular-nums ${eloChange >= 0 ? 'text-accent' : 'text-red-400/60'}`}>
            {eloChange >= 0 ? '+' : ''}{eloChange} Elo
          </span>
        </div>

        <div className="flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-2">
            <span className="text-ink-secondary">{myName}</span>
            {myProfile && <RankBadge elo={myProfile.elo_rating} size="sm" />}
          </div>
          <span className="text-ink-faint">vs</span>
          <div className="flex items-center gap-2">
            {opponentProfile && <RankBadge elo={opponentProfile.elo_rating} size="sm" />}
            <span className="text-ink-secondary">{opponentName}</span>
          </div>
        </div>
      </div>

      {/* Problem-by-problem breakdown */}
      <div className="space-y-3">
        <div className="text-[11px] tracking-[2px] text-ink-faint">PROBLEM BREAKDOWN</div>

        {attemptedProblems.map(({ problem, index, myCorrect, myWrong, mySolveMs, opCorrect, opWrong, opSolveMs }) => (
          <div key={index} className="border border-edge rounded-sm overflow-hidden">
            {/* Problem header */}
            <div className="flex items-center justify-between px-4 py-3 bg-card">
              <div className="flex items-center gap-3">
                <span className="text-[11px] tracking-[1.5px] text-ink-faint font-mono">#{index + 1}</span>
                <span className="font-mono text-lg text-ink">
                  {problem.operand1} {formatOp(problem.operation)} {problem.operand2}
                </span>
              </div>
              <span className="font-mono text-sm text-ink-secondary">= {problem.answer}</span>
            </div>

            {/* Player results */}
            <div className="grid grid-cols-2 divide-x divide-edge">
              {/* Your result */}
              <div className="px-4 py-3 space-y-1.5">
                <div className="text-[11px] tracking-[1px] text-ink-faint">YOU</div>
                {myCorrect ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500/80 text-[12px]">Correct</span>
                      <span className="font-mono text-[12px] text-ink-muted tabular-nums">
                        {myCorrect.submitted_answer}
                      </span>
                    </div>
                    {mySolveMs !== null && (
                      <div className="text-[12px] text-ink-faint font-mono tabular-nums">
                        {formatTime(mySolveMs)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[12px] text-ink-faint">Not solved</div>
                )}
                {myWrong.length > 0 && (
                  <div className="space-y-0.5">
                    {myWrong.map((w, i) => (
                      <div key={i} className="flex items-center gap-2 text-[12px]">
                        <span className="text-red-400/60">Wrong</span>
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
                <div className="text-[11px] tracking-[1px] text-ink-faint">{opponentName.toUpperCase()}</div>
                {opCorrect ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500/80 text-[12px]">Correct</span>
                      <span className="font-mono text-[12px] text-ink-muted tabular-nums">
                        {opCorrect.submitted_answer}
                      </span>
                    </div>
                    {opSolveMs !== null && (
                      <div className="text-[12px] text-ink-faint font-mono tabular-nums">
                        {formatTime(opSolveMs)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[12px] text-ink-faint">Not solved</div>
                )}
                {opWrong.length > 0 && (
                  <div className="space-y-0.5">
                    {opWrong.map((w, i) => (
                      <div key={i} className="flex items-center gap-2 text-[12px]">
                        <span className="text-red-400/60">Wrong</span>
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
      <div className="flex items-center gap-3 pt-2 pb-8">
        <Link
          href="/dashboard"
          className="px-5 py-2.5 border border-edge text-ink-muted text-[12px] tracking-[1.5px] rounded-sm transition-colors hover:border-edge-strong hover:text-ink-tertiary"
        >
          DASHBOARD
        </Link>
        <Link
          href="/play"
          className="px-5 py-2.5 bg-btn text-btn-text text-[12px] tracking-[1.5px] rounded-sm transition-colors hover:bg-btn-hover"
        >
          PLAY AGAIN
        </Link>
      </div>
    </div>
  );
}
