export type Operation = '+' | '-' | '*' | '/';

export type MatchStatus = 'waiting' | 'pending_accept' | 'active' | 'completed' | 'abandoned';

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
  country: string | null;
  onboarding_completed: boolean;
  email_verified: boolean;
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
  player1_accepted_at: string | null;
  player2_accepted_at: string | null;
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

export type ChallengeStatus = 'pending' | 'accepted' | 'completed' | 'expired';

export interface Challenge {
  id: string;
  code: string;
  sender_id: string;
  recipient_id: string | null;
  match_id: string | null;
  status: ChallengeStatus;
  created_at: string;
  accepted_at: string | null;
  expires_at: string;
}

// ─── Social layer ────────────────────────────────────

export type FriendshipStatus = 'pending' | 'accepted';

/**
 * State of the friendship between the *viewer* and a target user. Used by
 * FriendActionButton to render the right label/handler without the component
 * needing to know anything about canonical pairs.
 */
export type UserFriendshipState =
  | 'none'              // no row exists
  | 'self'              // target === viewer
  | 'pending_outgoing'  // viewer sent it, waiting on target
  | 'pending_incoming'  // target sent it, viewer needs to accept
  | 'accepted';         // accepted friends

export interface Friendship {
  user_a: string;
  user_b: string;
  status: FriendshipStatus;
  requested_by: string;
  created_at: string;
  accepted_at: string | null;
}

/** Compact profile shape used throughout friends/search/match-history UIs. */
export interface ProfileSnippet {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  elo_rating: number;
}

export interface FriendSummary extends ProfileSnippet {
  games_played: number;
  games_won: number;
  since: string | null;
}

export interface FriendRequestSummary extends ProfileSnippet {
  requested_at: string;
}

export interface FriendsResponse {
  friends: FriendSummary[];
  pending_incoming: FriendRequestSummary[];
  pending_outgoing: FriendRequestSummary[];
  unread_count: number;
}

export interface UserSearchResult extends ProfileSnippet {
  friendship: {
    status: UserFriendshipState;
    requested_by: string | null;
  };
}

export interface MatchHistoryItem {
  match_id: string;
  completed_at: string;
  target_score: number;
  opponent: ProfileSnippet | null;
  viewer_score: number;
  opponent_score: number;
  result: 'win' | 'loss' | 'draw';
  viewer_elo_before: number | null;
  viewer_elo_after: number | null;
  elo_delta: number;
}

export interface MatchHistoryResponse {
  page: number;
  pageSize: number;
  hasMore: boolean;
  items: MatchHistoryItem[];
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: 'milestone' | 'performance' | 'streak' | 'social';
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  match_id: string | null;
}

export interface DailyPuzzleResult {
  id: string;
  user_id: string;
  puzzle_date: string;
  total_time_ms: number;
  problem_times: number[];
  completed_at: string;
}

// ─── Interactive Lessons ─────────────────────────────

export interface TeachStep {
  type: 'teach';
  title?: string;
  content: string;
  formula?: string;
  emoji?: string;
}

export interface ExampleStep {
  type: 'example';
  problem: string;
  revealSteps: string[];
  finalAnswer: string;
}

export interface PracticeStep {
  type: 'practice';
  prompt: string;
  operand1: number;
  operand2: number;
  operation: string;
  answer: number;
  hint?: string;
}

export interface QuizStep {
  type: 'quiz';
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export type LessonStep = TeachStep | ExampleStep | PracticeStep | QuizStep;

export interface InteractiveLesson {
  slug: string;
  title: string;
  description: string;
  category: string;
  emoji: string;
  difficulty: 1 | 2;
  sortOrder: number;
  steps: LessonStep[];
  xpReward: number;
  perfectBonus: number;
}

export interface LessonProgress {
  lessonSlug: string;
  completedAt: string;
  heartsRemaining: number;
  xpEarned: number;
}

// ─── Practice Mode ──────────────────────────────────

export type PracticeDifficulty = 'beginner' | 'standard' | 'hard' | 'expert';

export interface OperationRange {
  min1: number;
  max1: number;
  min2: number;
  max2: number;
}

export interface PracticeConfig {
  operations: Operation[];
  duration: 60 | 120 | 300;
  difficulty: PracticeDifficulty;
  customRanges?: Partial<Record<Operation, OperationRange>>;
}

export interface PracticeSessionResult {
  config: PracticeConfig;
  score: number;
  correctCount: number;
  wrongCount: number;
  bestStreak: number;
  operationBreakdown: Partial<Record<Operation, { correct: number; wrong: number }>>;
}

export interface PracticeSessionRecord {
  id: string;
  user_id: string;
  duration: number;
  operations: Operation[];
  config: PracticeConfig;
  score: number;
  correct_count: number;
  wrong_count: number;
  best_streak: number;
  operation_breakdown: Record<string, { correct: number; wrong: number }>;
  created_at: string;
}
