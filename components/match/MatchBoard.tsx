'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMatch } from '@/hooks/useMatch';
import { useAuth } from '@/hooks/useAuth';
import { ProblemDisplay } from './ProblemDisplay';
import { AnswerInput } from './AnswerInput';
import { ScoreDots } from './ScoreDots';
import { Timer } from './Timer';
import { MatchResult } from './MatchResult';
import { Skeleton } from '@/components/ui/Skeleton';
import { createClient } from '@/lib/supabase/client';
import type { Profile, MatchEvent } from '@/types';

interface MatchStats {
  avgTimeMs: number;
  accuracy: number;
  fastestSolveMs: number;
  totalPenalties: number;
}

interface MatchBoardProps {
  matchId: string;
}

export function MatchBoard({ matchId }: MatchBoardProps) {
  const { match, loading, submitAnswer, abandonMatch, refetchMatch } = useMatch(matchId);
  const { user } = useAuth();
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [player1Profile, setPlayer1Profile] = useState<Profile | null>(null);
  const [player2Profile, setPlayer2Profile] = useState<Profile | null>(null);
  const [showCountdown, setShowCountdown] = useState(true);
  const [countdownValue, setCountdownValue] = useState<number | string | null>(3);
  const [streak, setStreak] = useState(0);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [newAchievements, setNewAchievements] = useState<{ id: string; name: string; description: string; icon: string; rarity: string }[]>([]);
  const supabase = useMemo(() => createClient(), []);
  const isSubmittingRef = useRef(false);

  // Fetch player profiles
  useEffect(() => {
    if (!match) return;

    const fetchProfiles = async () => {
      const { data: p1 } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', match.player1_id)
        .single();

      if (p1) setPlayer1Profile(p1 as Profile);

      if (match.player2_id) {
        const { data: p2 } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', match.player2_id)
          .single();

        if (p2) setPlayer2Profile(p2 as Profile);
      }
    };

    fetchProfiles();
  }, [match?.player1_id, match?.player2_id]);

  // 5A: Countdown timer effect
  useEffect(() => {
    if (!showCountdown || match?.status !== 'active') return;

    const sequence: (number | string)[] = [3, 2, 1, 'GO!'];
    let step = 0;
    setCountdownValue(sequence[step]);

    const interval = setInterval(() => {
      step += 1;
      if (step < sequence.length) {
        setCountdownValue(sequence[step]);
      } else {
        clearInterval(interval);
        setShowCountdown(false);
        setCountdownValue(null);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [showCountdown, match?.status]);

  // Fetch match events on completion to compute performance stats
  useEffect(() => {
    if (!match || !user) return;
    if (match.status !== 'completed' && match.status !== 'abandoned') return;

    const fetchStats = async () => {
      const { data: events } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .eq('player_id', user.id)
        .order('created_at', { ascending: true });

      if (!events || events.length === 0) return;

      const typedEvents = events as MatchEvent[];

      const correctEvents = typedEvents.filter(e => e.event === 'answer_correct');
      const wrongEvents = typedEvents.filter(e => e.event === 'answer_wrong');

      // Compute per-problem solve times from elapsed_ms deltas
      const solveTimes: number[] = [];
      for (let i = 0; i < correctEvents.length; i++) {
        if (i === 0) {
          // First correct answer: time from match start (elapsed_ms is already from match start)
          solveTimes.push(correctEvents[i].elapsed_ms);
        } else {
          solveTimes.push(correctEvents[i].elapsed_ms - correctEvents[i - 1].elapsed_ms);
        }
      }

      const totalAttempts = correctEvents.length + wrongEvents.length;
      const accuracy = totalAttempts > 0 ? (correctEvents.length / totalAttempts) * 100 : 0;
      const avgTimeMs = solveTimes.length > 0 ? solveTimes.reduce((a, b) => a + b, 0) / solveTimes.length : 0;
      const fastestSolveMs = solveTimes.length > 0 ? Math.min(...solveTimes) : 0;

      setMatchStats({
        avgTimeMs,
        accuracy,
        fastestSolveMs,
        totalPenalties: wrongEvents.length,
      });
    };

    fetchStats();
  }, [match?.status, matchId, user?.id]);

  // Sync currentProblemIndex with server score (handles page refresh and desync)
  useEffect(() => {
    if (match && user && match.status === 'active') {
      const myScore = match.player1_id === user.id ? match.player1_score : match.player2_score;
      setCurrentProblemIndex(prev => Math.max(prev, myScore));
    }
  }, [match?.player1_score, match?.player2_score, match?.player1_id, match?.status, user?.id]);

  const handleSubmit = useCallback(
    async (answer: number) => {
      if (!match || match.status !== 'active' || isSubmittingRef.current) return;
      isSubmittingRef.current = true;

      try {
        const result = await submitAnswer(currentProblemIndex, answer);

        const feedbackFn = (window as unknown as Record<string, unknown>).__answerInputFeedback as
          | ((correct: boolean) => void)
          | undefined;

        // Server error (e.g. match already completed by opponent)
        if (result.error) {
          refetchMatch();
          return;
        }

        // Correct answer that completed the match (we won)
        if (result.correct && result.matchStatus === 'completed') {
          feedbackFn?.(true);
          setStreak((prev) => prev + 1);
          if (result.newAchievements && result.newAchievements.length > 0) {
            setNewAchievements(result.newAchievements);
          }
          refetchMatch();
          return;
        }

        // Normal correct answer
        if (result.correct) {
          feedbackFn?.(true);
          setStreak((prev) => prev + 1);
          setCurrentProblemIndex((prev) => prev + 1);
          return;
        }

        // Wrong answer
        feedbackFn?.(false);
        setStreak(0);
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [match, currentProblemIndex, submitAnswer, refetchMatch]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md space-y-6">
          <div className="border border-edge rounded-sm p-8 space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-48 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!match || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-red-400/60">Match not found</div>
      </div>
    );
  }

  const isPlayer1 = match.player1_id === user.id;

  // Match completed — show results
  if (match.status === 'completed' || match.status === 'abandoned') {
    const won = match.winner_id === user.id;
    const myScore = isPlayer1 ? match.player1_score : match.player2_score;
    const theirScore = isPlayer1 ? match.player2_score : match.player1_score;
    const eloBefore = (isPlayer1 ? match.player1_elo_before : match.player2_elo_before) ?? 1200;
    const eloAfter = (isPlayer1 ? match.player1_elo_after : match.player2_elo_after) ?? 1200;
    const penalties = isPlayer1 ? match.player1_penalties : match.player2_penalties;
    const opponentProfile = isPlayer1 ? player2Profile : player1Profile;

    return (
      <MatchResult
        won={won}
        myScore={myScore}
        theirScore={theirScore}
        targetScore={match.target_score}
        eloBefore={eloBefore}
        eloAfter={eloAfter}
        penalties={penalties}
        opponentName={opponentProfile?.username ?? 'Opponent'}
        opponentElo={opponentProfile?.elo_rating}
        avgTimeMs={matchStats?.avgTimeMs}
        accuracy={matchStats?.accuracy}
        fastestSolveMs={matchStats?.fastestSolveMs}
        totalPenalties={matchStats?.totalPenalties}
        newAchievements={newAchievements.length > 0 ? newAchievements : undefined}
        opponentId={isPlayer1 ? match.player2_id ?? undefined : match.player1_id}
        matchId={matchId}
      />
    );
  }

  // Waiting for opponent
  if (match.status === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border border-edge-strong border-t-ink-secondary rounded-full animate-spin" />
        <div className="text-[15px] text-ink-tertiary">Waiting for opponent...</div>
        <button
          onClick={abandonMatch}
          className="px-4 py-2 text-[12px] tracking-[1.5px] text-ink-muted hover:text-ink-tertiary transition-colors"
        >
          CANCEL
        </button>
      </div>
    );
  }

  // Active match
  const problems = match.problems as { operand1: number; operand2: number; operation: string; answer: number }[];
  const currentProblem = problems[currentProblemIndex];

  if (!currentProblem) {
    // Out of problems but match still active — recover by syncing with server score
    if (match.status === 'active') {
      const myScore = isPlayer1 ? match.player1_score : match.player2_score;
      if (myScore < problems.length) {
        setCurrentProblemIndex(myScore);
      }
      refetchMatch();
    }

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-ink-muted">Finalizing results...</div>
      </div>
    );
  }

  // 5C: Match point detection
  const isMatchPoint = match.player1_score === match.target_score - 1 || match.player2_score === match.target_score - 1;

  const player1Name = player1Profile?.username ?? 'Player 1';
  const player2Name = player2Profile?.username ?? 'Player 2';

  return (
    <div className="relative">
      {/* 5A: Countdown overlay */}
      <AnimatePresence>
        {showCountdown && countdownValue !== null && (
          <motion.div
            key="countdown-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-page/90"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={String(countdownValue)}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                  duration: 0.4,
                }}
                className={`text-8xl font-serif font-bold select-none ${
                  countdownValue === 'GO!' ? 'text-accent' : 'text-ink'
                }`}
              >
                {countdownValue}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5C: Match point container with pulsing border */}
      <div
        className={`flex flex-col items-center gap-8 py-8 rounded-lg ${
          isMatchPoint ? 'border border-accent/30 animate-gold-pulse p-4' : ''
        }`}
      >
        {/* 5C: Match point text */}
        <AnimatePresence>
          {isMatchPoint && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="text-[12px] tracking-[3px] text-accent/70 font-mono"
            >
              MATCH POINT
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between w-full max-w-2xl">
          <Timer startTime={match.started_at} isRunning={match.status === 'active'} />
          <button
            onClick={abandonMatch}
            className="text-[12px] tracking-[1.5px] text-ink-faint hover:text-red-400/60 transition-colors"
          >
            FORFEIT
          </button>
        </div>

        {/* 5B: ScoreDots replacing ScoreBar */}
        <div className="flex items-center justify-between w-full max-w-2xl">
          <div className="flex flex-col items-start gap-1">
            <span className="text-[12px] tracking-[1.5px] text-ink-muted">
              {isPlayer1 ? player1Name : player2Name} {isPlayer1 ? '(YOU)' : ''}
            </span>
            <ScoreDots
              score={isPlayer1 ? match.player1_score : match.player2_score}
              targetScore={match.target_score}
              color="gold"
            />
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[12px] tracking-[1.5px] text-ink-muted">
              {isPlayer1 ? player2Name : player1Name} {!isPlayer1 ? '(YOU)' : ''}
            </span>
            <ScoreDots
              score={isPlayer1 ? match.player2_score : match.player1_score}
              targetScore={match.target_score}
              color="muted"
            />
          </div>
        </div>

        {/* Problem counter + 5E: Streak indicator */}
        <div className="flex items-center gap-3">
          <div className="text-[11px] tracking-[2px] text-ink-faint">
            PROBLEM {currentProblemIndex + 1}
          </div>
          {streak >= 3 && (
            <motion.div
              key={streak}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-accent text-sm font-mono"
            >
              {'\uD83D\uDD25'} {streak}x
            </motion.div>
          )}
        </div>

        {/* 5D: Problem slide transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentProblemIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <ProblemDisplay
              operand1={currentProblem.operand1}
              operand2={currentProblem.operand2}
              operation={currentProblem.operation}
            />
          </motion.div>
        </AnimatePresence>

        <AnswerInput onSubmit={handleSubmit} disabled={match.status !== 'active'} />
      </div>
    </div>
  );
}
