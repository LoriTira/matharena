'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMatch } from '@/hooks/useMatch';
import { useAuth } from '@/hooks/useAuth';
import { useSound } from '@/hooks/useSound';
import { ProblemDisplay } from './ProblemDisplay';
import { AnswerInput } from './AnswerInput';
import { Timer } from './Timer';
import { MatchResult } from './MatchResult';
import { Skeleton } from '@/components/ui/Skeleton';
import { createClient } from '@/lib/supabase/client';
import { hapticTap } from '@/lib/haptics';
import { GAME_CONFIG } from '@/lib/constants';
import { computeTierIndex } from '@/hooks/useWarmup';
import { RaceLane } from '@/components/arcade/RaceLane';
import { Countdown } from '@/components/arcade/Countdown';
import { type Tier } from '@/components/arcade/tokens';
import { getRank } from '@/lib/ranks';
import type { Profile, MatchEvent } from '@/types';

const RANKED_TIER_LABELS = ['', 'HOT', 'ON FIRE', 'UNSTOPPABLE'] as const;

function tierToArcade(tier: string): Tier {
  switch (tier) {
    case 'Bronze':      return 'Bronze';
    case 'Silver':      return 'Silver';
    case 'Gold':        return 'Gold';
    case 'Platinum':    return 'Platinum';
    case 'Diamond':     return 'Diamond';
    case 'Grandmaster': return 'Grand';
    default:            return 'Wood';
  }
}

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
  const { play } = useSound();
  const prefersReducedMotion = useReducedMotion();
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [player1Profile, setPlayer1Profile] = useState<Profile | null>(null);
  const [player2Profile, setPlayer2Profile] = useState<Profile | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownValue, setCountdownValue] = useState<number | string | null>(null);
  const [streak, setStreak] = useState(0);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [newAchievements, setNewAchievements] = useState<{ id: string; name: string; description: string; icon: string; rarity: string }[]>([]);
  const supabase = useMemo(() => createClient(), []);
  const isSubmittingRef = useRef(false);

  const streakTier = computeTierIndex(streak, GAME_CONFIG.RANKED_STREAK_MILESTONES);
  const prevStreakTierRef = useRef(0);
  const prevCountdownValueRef = useRef<number | string | null>(null);
  const prevMatchPointRef = useRef(false);
  const matchCompleteFiredRef = useRef(false);

  useEffect(() => {
    if (!match) return;
    (async () => {
      const { data: p1 } = await supabase.from('profiles').select('*').eq('id', match.player1_id).single();
      if (p1) setPlayer1Profile(p1 as Profile);

      if (match.player2_id) {
        const { data: p2 } = await supabase.from('profiles').select('*').eq('id', match.player2_id).single();
        if (p2) setPlayer2Profile(p2 as Profile);
      }
    })();
  }, [match?.player1_id, match?.player2_id]);

  useEffect(() => {
    if (!match || match.status !== 'active' || !match.started_at) return;

    const startMs = new Date(match.started_at).getTime();

    if (Date.now() >= startMs) {
      setShowCountdown(false);
      setCountdownValue(null);
      return;
    }

    setShowCountdown(true);

    const tick = () => {
      const remainingMs = startMs - Date.now();
      let next: number | string | null;
      if (remainingMs > 0) {
        next = Math.min(3, Math.ceil(remainingMs / 1000));
      } else if (remainingMs > -400) {
        next = 'GO!';
      } else {
        setShowCountdown(false);
        setCountdownValue(null);
        return;
      }

      if (next !== prevCountdownValueRef.current) {
        prevCountdownValueRef.current = next;
        if (next === 'GO!') play('countdownGo');
        else if (typeof next === 'number') play('countdownTick');
      }

      setCountdownValue(next);
    };

    tick();
    const interval = setInterval(tick, 100);
    return () => {
      clearInterval(interval);
      prevCountdownValueRef.current = null;
    };
  }, [match?.status, match?.started_at, play]);

  useEffect(() => {
    if (!match || !user) return;
    if (match.status !== 'completed' && match.status !== 'abandoned') return;

    (async () => {
      const { data: events } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .eq('player_id', user.id)
        .order('created_at', { ascending: true });

      if (!events || events.length === 0) return;
      const typedEvents = events as MatchEvent[];
      const correctEvents = typedEvents.filter((e) => e.event === 'answer_correct');
      const wrongEvents = typedEvents.filter((e) => e.event === 'answer_wrong');

      const solveTimes: number[] = [];
      for (let i = 0; i < correctEvents.length; i++) {
        if (i === 0) solveTimes.push(correctEvents[i].elapsed_ms);
        else solveTimes.push(correctEvents[i].elapsed_ms - correctEvents[i - 1].elapsed_ms);
      }

      const totalAttempts = correctEvents.length + wrongEvents.length;
      const accuracy = totalAttempts > 0 ? (correctEvents.length / totalAttempts) * 100 : 0;
      const avgTimeMs = solveTimes.length > 0 ? solveTimes.reduce((a, b) => a + b, 0) / solveTimes.length : 0;
      const fastestSolveMs = solveTimes.length > 0 ? Math.min(...solveTimes) : 0;

      setMatchStats({ avgTimeMs, accuracy, fastestSolveMs, totalPenalties: wrongEvents.length });
    })();
  }, [match?.status, matchId, user?.id]);

  useEffect(() => {
    if (match && user && match.status === 'active') {
      const myScore = match.player1_id === user.id ? match.player1_score : match.player2_score;
      setCurrentProblemIndex((prev) => Math.max(prev, myScore));
    }
  }, [match?.player1_score, match?.player2_score, match?.player1_id, match?.status, user?.id]);

  useEffect(() => {
    if (streakTier > prevStreakTierRef.current && streakTier > 0) {
      play('streakTier', streakTier);
      hapticTap(streakTier === 1 ? 'light' : streakTier === 2 ? 'medium' : 'heavy');

      if (!prefersReducedMotion && typeof window !== 'undefined') {
        import('canvas-confetti').then(({ default: confetti }) => {
          confetti({
            particleCount: 30,
            spread: 45,
            startVelocity: 25,
            origin: { y: 0.35 },
            scalar: 0.7,
            colors: ['#36e4ff', '#ff2a7f', '#ffd23f'],
          });
        }).catch(() => {});
      }
    }
    prevStreakTierRef.current = streakTier;
  }, [streakTier, play, prefersReducedMotion]);

  const matchPointActive =
    !!match &&
    match.status === 'active' &&
    (match.player1_score === match.target_score - 1 || match.player2_score === match.target_score - 1);

  useEffect(() => {
    if (matchPointActive && !prevMatchPointRef.current) {
      play('matchPoint');
      hapticTap('medium');
    }
    prevMatchPointRef.current = matchPointActive;
  }, [matchPointActive, play]);

  useEffect(() => {
    if (!match || !user) return;
    if (match.status !== 'completed' && match.status !== 'abandoned') return;
    if (matchCompleteFiredRef.current) return;
    matchCompleteFiredRef.current = true;

    const won = match.winner_id === user.id;
    if (won) {
      play('victory');
      hapticTap('success');
    } else {
      play('defeat');
    }
  }, [match?.status, match?.winner_id, user?.id, play]);

  const handleSubmit = useCallback(
    (answer: number) => {
      if (!match || match.status !== 'active' || isSubmittingRef.current) return;
      isSubmittingRef.current = true;

      const problems = match.problems as { operand1: number; operand2: number; operation: string; answer: number }[];
      const problem = problems[currentProblemIndex];
      const isCorrect = answer === problem?.answer;

      const feedbackFn = (window as unknown as Record<string, unknown>).__answerInputFeedback as
        | ((correct: boolean) => void) | undefined;

      if (isCorrect) {
        feedbackFn?.(true);
        play('correct');
        hapticTap('light');
        setStreak((prev) => prev + 1);

        const isPlayer1 = match.player1_id === user?.id;
        const myScore = isPlayer1 ? match.player1_score : match.player2_score;
        const isWinningAnswer = myScore + 1 >= match.target_score;

        if (!isWinningAnswer) {
          setCurrentProblemIndex((prev) => prev + 1);
          isSubmittingRef.current = false;
        }

        submitAnswer(currentProblemIndex, answer).then((result) => {
          if (result.error) {
            refetchMatch();
          } else if (result.matchStatus === 'completed') {
            if (result.newAchievements && result.newAchievements.length > 0) {
              setNewAchievements(result.newAchievements);
            }
            refetchMatch();
          }
        }).finally(() => { isSubmittingRef.current = false; });
        return;
      }

      feedbackFn?.(false);
      play('wrong');
      hapticTap('error');
      setStreak(0);
      submitAnswer(currentProblemIndex, answer).finally(() => { isSubmittingRef.current = false; });
    },
    [match, currentProblemIndex, submitAnswer, refetchMatch, play]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md space-y-6">
          <div className="border border-edge p-8 space-y-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!match || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-magenta font-mono text-[12px] uppercase tracking-[1.6px]">Match not found</div>
      </div>
    );
  }

  const isPlayer1 = match.player1_id === user.id;

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

  if (match.status === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border border-edge-strong border-t-cyan rounded-full animate-spin" />
        <div className="font-mono text-[12px] text-ink-tertiary uppercase tracking-[1.4px]">Waiting for opponent…</div>
        <button
          onClick={abandonMatch}
          className="px-4 py-2 font-mono text-[11px] tracking-[1.5px] text-ink-muted hover:text-magenta transition-colors uppercase"
        >
          Cancel
        </button>
      </div>
    );
  }

  const problems = match.problems as { operand1: number; operand2: number; operation: string; answer: number }[];
  const currentProblem = problems[currentProblemIndex];

  if (!currentProblem) {
    if (match.status === 'active') {
      const myScore = isPlayer1 ? match.player1_score : match.player2_score;
      if (myScore < problems.length) setCurrentProblemIndex(myScore);
      refetchMatch();
    }
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-ink-tertiary font-mono text-[12px] uppercase tracking-[1.4px]">Finalizing results…</div>
      </div>
    );
  }

  const isMatchPoint = matchPointActive;
  const myScore = isPlayer1 ? match.player1_score : match.player2_score;
  const theirScore = isPlayer1 ? match.player2_score : match.player1_score;
  const myProgress = myScore / match.target_score;
  const theirProgress = theirScore / match.target_score;

  const myProfile = isPlayer1 ? player1Profile : player2Profile;
  const theirProfile = isPlayer1 ? player2Profile : player1Profile;
  const myElo = myProfile?.elo_rating ?? 1200;
  const theirElo = theirProfile?.elo_rating ?? 1200;
  const myTier = tierToArcade(getRank(myElo).tier);
  const theirTier = tierToArcade(getRank(theirElo).tier);
  const myName = myProfile?.username ?? 'YOU';
  const theirName = theirProfile?.username ?? 'Opponent';

  return (
    <div className="relative match-screen">
      {showCountdown && countdownValue !== null && <Countdown value={countdownValue} fixed />}

      <div className="flex flex-col gap-5 md:gap-7 py-4 md:py-6">
        {/* Match chrome */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-[6px] px-[10px] py-[4px] border border-danger" style={{ background: 'rgba(255,77,109,0.08)' }}>
              <span className="w-[6px] h-[6px] rounded-full" style={{ background: 'var(--neon-danger)', boxShadow: '0 0 6px var(--neon-danger)' }} />
              <span className="font-mono text-[10px] text-danger uppercase tracking-[1.4px] font-bold">Ranked · Live</span>
            </div>
            <span className="font-mono text-[11px] text-ink-tertiary uppercase tracking-[1.2px]">
              Round {myScore + theirScore + 1} / {match.target_score * 2 - 1}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Timer startTime={match.started_at} isRunning={match.status === 'active'} />
            <button
              onClick={abandonMatch}
              className="font-mono text-[11px] text-ink-faint hover:text-magenta uppercase tracking-[1.2px] transition-colors"
            >
              Forfeit →
            </button>
          </div>
        </div>

        {/* Race track — YOU then OPPONENT */}
        <div className="flex flex-col gap-[10px]">
          <RaceLane
            you
            color="cyan"
            name={myName}
            elo={myElo}
            tier={myTier}
            progress={myProgress}
            streak={streak}
            avatar={myName[0]?.toUpperCase()}
            gates={match.target_score}
          />
          <RaceLane
            color="magenta"
            name={theirName}
            elo={theirElo}
            tier={theirTier}
            progress={theirProgress}
            avatar={theirName[0]?.toUpperCase()}
            gates={match.target_score}
          />
        </div>

        {/* Match-point banner */}
        <AnimatePresence>
          {isMatchPoint && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex justify-center"
            >
              <div className="font-mono text-[12px] tracking-[3px] text-gold border border-gold px-3 py-1 animate-gold-pulse">
                MATCH POINT
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Problem area */}
        <div
          className="relative border border-edge-strong px-5 py-8 md:px-8 md:py-10"
          style={{ background: 'linear-gradient(180deg, var(--bg-raised), var(--bg-base))' }}
        >
          <div className="absolute top-4 left-4 font-mono text-[10px] text-ink-faint uppercase tracking-[2px]">
            Problem {currentProblemIndex + 1}
          </div>

          {streak >= GAME_CONFIG.RANKED_STREAK_MILESTONES[0] && (
            <motion.div
              key={streak}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 border border-cyan bg-accent-glow"
            >
              <span className="font-mono text-[10px] tracking-[1.6px] text-cyan font-bold">
                {RANKED_TIER_LABELS[Math.min(streakTier, RANKED_TIER_LABELS.length - 1)]}
              </span>
              <span className="font-mono text-cyan font-bold tabular-nums">{streak}×</span>
            </motion.div>
          )}

          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentProblemIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
            >
              <ProblemDisplay
                operand1={currentProblem.operand1}
                operand2={currentProblem.operand2}
                operation={currentProblem.operation}
              />
            </motion.div>
          </AnimatePresence>

          <AnswerInput onSubmit={handleSubmit} disabled={match.status !== 'active' || showCountdown} />
        </div>
      </div>
    </div>
  );
}
