/**
 * Get today's puzzle date as YYYY-MM-DD string.
 * Uses UTC to ensure all users worldwide get the same puzzle on the same server day.
 * The daily puzzle resets at midnight UTC.
 */
export function getTodayPuzzleDate(): string {
  return new Date().toISOString().split('T')[0];
}
