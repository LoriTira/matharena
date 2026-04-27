'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { MatchDetailModal } from '@/components/profile/MatchDetailModal';
import type { MatchHistoryItem, MatchHistoryResponse } from '@/types';

interface MatchHistoryListProps {
  /** Whose history to render (own profile or a public profile). */
  userId: string;
  /** Who is looking — included for future viewer-specific touches (head-to-head etc.). */
  viewerId?: string;
  /**
   * Label for the "viewer" column in the detail modal. On your own profile
   * this defaults to "YOU"; on a public profile, pass the owner's display
   * name so the breakdown reads correctly.
   */
  ownerLabel?: string;
}

function formatRelative(iso: string): string {
  if (!iso) return '';
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

/**
 * Paginated list of a user's completed matches. Each row shows opponent,
 * W/L, score, Elo delta, and a relative timestamp. Clicking a row opens
 * the MatchDetailModal with per-problem events.
 */
export function MatchHistoryList({ userId, viewerId, ownerLabel }: MatchHistoryListProps) {
  const [items, setItems] = useState<MatchHistoryItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [openMatchId, setOpenMatchId] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const res = await fetch(`/api/matches/history?userId=${userId}&page=${nextPage}`);
        if (res.ok) {
          const data = (await res.json()) as MatchHistoryResponse;
          setItems((prev) => (append ? [...prev, ...data.items] : data.items));
          setHasMore(data.hasMore);
          setPage(data.page);
        }
      } catch (err) {
        console.error('Match history fetch failed:', err);
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    fetchPage(0, false);
  }, [fetchPage]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] tracking-[3px] font-black text-accent">▸ MATCH HISTORY</div>
        {items.length > 0 && (
          <div className="font-mono text-[12px] font-black text-ink-tertiary tabular-nums">
            {items.length}{hasMore ? '+' : ''}
          </div>
        )}
      </div>

      {loading ? (
        <div className="border-2 border-edge-strong rounded-xl overflow-hidden bg-panel">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-edge-faint last:border-b-0">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-14" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="border-2 border-dashed border-edge-strong rounded-xl p-6 text-center bg-panel">
          <div className="text-ink-tertiary text-[13px] font-semibold">No matches yet</div>
        </div>
      ) : (
        <>
          <div className="border-2 border-edge-strong rounded-xl overflow-hidden bg-panel">
            {items.map((item) => (
              <MatchRow
                key={item.match_id}
                item={item}
                onOpen={() => setOpenMatchId(item.match_id)}
              />
            ))}
          </div>
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={() => fetchPage(page + 1, true)}
                disabled={loadingMore}
                className="px-6 py-3 border-2 border-edge-strong text-ink font-black text-[12px] tracking-[2.5px] rounded-md hover:border-edge-bold hover:bg-shade transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'LOADING…' : 'LOAD MORE'}
              </button>
            </div>
          )}
        </>
      )}

      <MatchDetailModal
        matchId={openMatchId}
        // Modal orients around the profile owner (whose history this is),
        // not the currently-logged-in viewer. That way the "viewer" column
        // is always the person whose profile we're on — consistent whether
        // you're looking at your own page or someone else's. Caller passes
        // ownerLabel so the column header reads correctly when viewing
        // another user's profile.
        viewerId={userId}
        viewerLabel={
          viewerId && viewerId === userId ? 'YOU' : ownerLabel ?? 'PROFILE'
        }
        onClose={() => setOpenMatchId(null)}
      />
    </div>
  );
}

// ─── Row ────────────────────────────────────────────

function MatchRow({
  item,
  onOpen,
}: {
  item: MatchHistoryItem;
  onOpen: () => void;
}) {
  const opponent = item.opponent;
  const opponentName = opponent ? (opponent.display_name || opponent.username) : 'Unknown';
  const resultBadge =
    item.result === 'win'
      ? { label: 'W', border: 'border-l-[var(--feedback-correct)]', text: 'text-feedback-correct' }
      : item.result === 'loss'
      ? { label: 'L', border: 'border-l-[var(--feedback-wrong)]', text: 'text-feedback-wrong' }
      : { label: 'D', border: 'border-l-ink-muted', text: 'text-ink-muted' };

  const deltaClass =
    item.elo_delta > 0
      ? 'text-feedback-correct'
      : item.elo_delta < 0
      ? 'text-feedback-wrong'
      : 'text-ink-faint';
  const deltaSign = item.elo_delta > 0 ? '+' : item.elo_delta < 0 ? '' : '±';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen();
      }}
      className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3.5 border-b border-edge-faint last:border-b-0 border-l-[3px] ${resultBadge.border} hover:bg-shade transition-colors cursor-pointer`}
    >
      {opponent ? (
        <Link
          href={`/profile/${opponent.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-3 min-w-0 flex-1 hover:text-ink transition-colors"
        >
          <Avatar user={opponent} size="sm" />
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-ink truncate">{opponentName}</div>
            <div className="text-[11px] font-bold text-ink-tertiary font-mono tabular-nums">
              Elo {opponent.elo_rating}
            </div>
          </div>
        </Link>
      ) : (
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar user={{ username: 'unknown' }} size="sm" />
          <div className="text-[13px] text-ink-faint italic font-semibold">Unknown opponent</div>
        </div>
      )}

      <div className="shrink-0 flex items-center gap-2 sm:gap-4">
        <div className={`text-[12px] tracking-[1.5px] font-black ${resultBadge.text}`}>
          {resultBadge.label}
        </div>
        <div className="font-mono text-[13px] font-bold text-ink-secondary tabular-nums">
          {item.viewer_score}–{item.opponent_score}
        </div>
        <div className={`font-mono text-[12px] font-black tabular-nums w-12 text-right ${deltaClass}`}>
          {deltaSign}{item.elo_delta}
        </div>
        <div className="text-[11px] font-semibold text-ink-faint w-16 text-right hidden sm:block">
          {formatRelative(item.completed_at)}
        </div>
      </div>
    </div>
  );
}
