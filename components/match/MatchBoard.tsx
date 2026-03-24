'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMatch } from '@/hooks/useMatch';
import { useAuth } from '@/hooks/useAuth';
import { ProblemDisplay } from './ProblemDisplay';
import { AnswerInput } from './AnswerInput';
import { ScoreBar } from './ScoreBar';
import { Timer } from './Timer';
import { MatchResult } from './MatchResult';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

interface MatchBoardProps {
  matchId: string;
}

export function MatchBoard({ matchId }: MatchBoardProps) {
  const { match, loading, submitAnswer, abandonMatch, refetchMatch } = useMatch(matchId);
  const { user } = useAuth();
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [player1Profile, setPlayer1Profile] = useState<Profile | null>(null);
  const [player2Profile, setPlayer2Profile] = useState<Profile | null>(null);
  const supabase = createClient();

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

  const handleSubmit = useCallback(
    async (answer: number) => {
      if (!match || match.status !== 'active') return;

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
        refetchMatch();
        return;
      }

      // Normal correct answer
      if (result.correct) {
        feedbackFn?.(true);
        setCurrentProblemIndex((prev) => prev + 1);
        return;
      }

      // Wrong answer
      feedbackFn?.(false);
    },
    [match, currentProblemIndex, submitAnswer, refetchMatch]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-white/25">Loading match...</div>
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
      />
    );
  }

  // Waiting for opponent
  if (match.status === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border border-white/20 border-t-white/60 rounded-full animate-spin" />
        <div className="text-[15px] text-white/40">Waiting for opponent...</div>
        <button
          onClick={abandonMatch}
          className="px-4 py-2 text-[10px] tracking-[1.5px] text-white/30 hover:text-white/50 transition-colors"
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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-white/25">Waiting for results...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <Timer startTime={match.started_at} isRunning={match.status === 'active'} />
        <button
          onClick={abandonMatch}
          className="text-[10px] tracking-[1.5px] text-white/20 hover:text-red-400/60 transition-colors"
        >
          FORFEIT
        </button>
      </div>

      <ScoreBar
        player1Score={match.player1_score}
        player2Score={match.player2_score}
        targetScore={match.target_score}
        player1Name={player1Profile?.username ?? 'Player 1'}
        player2Name={player2Profile?.username ?? 'Player 2'}
        currentPlayerId={user.id}
        player1Id={match.player1_id}
      />

      <div className="text-[9px] tracking-[2px] text-white/20">
        PROBLEM {currentProblemIndex + 1}
      </div>

      <ProblemDisplay
        operand1={currentProblem.operand1}
        operand2={currentProblem.operand2}
        operation={currentProblem.operation}
      />

      <AnswerInput onSubmit={handleSubmit} disabled={match.status !== 'active'} />
    </div>
  );
}
