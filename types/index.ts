export type Operation = '+' | '-' | '*' | '/';

export type MatchStatus = 'waiting' | 'active' | 'completed' | 'abandoned';

export type EventType = 'answer_correct' | 'answer_wrong';

export type AffiliationType = 'school' | 'company';

export type DifficultyTier = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';

export interface Problem {
  operand1: number;
  operand2: number;
  operation: Operation;
  answer: number;
}

export interface ClientProblem {
  operand1: number;
  operand2: number;
  operation: Operation;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  elo_rating: number;
  games_played: number;
  games_won: number;
  affiliation: string | null;
  affiliation_type: AffiliationType | null;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  player1_id: string;
  player2_id: string | null;
  status: MatchStatus;
  problems: Problem[];
  target_score: number;
  player1_score: number;
  player2_score: number;
  player1_penalties: number;
  player2_penalties: number;
  player1_elo_before: number | null;
  player2_elo_before: number | null;
  player1_elo_after: number | null;
  player2_elo_after: number | null;
  winner_id: string | null;
  avg_difficulty: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface MatchEvent {
  id: string;
  match_id: string;
  player_id: string;
  problem_index: number;
  event: EventType;
  submitted_answer: string;
  elapsed_ms: number;
  created_at: string;
}

export interface Lesson {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  category: string;
  difficulty_level: number;
  sort_order: number;
  created_at: string;
}

export interface EloResult {
  newRatingA: number;
  newRatingB: number;
}
