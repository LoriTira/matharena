'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { RankBadge } from '@/components/ui/RankBadge';
import { FriendActionButton } from '@/components/profile/FriendActionButton';
import { SOCIAL_CONFIG } from '@/lib/constants';
import type { UserSearchResult, UserFriendshipState } from '@/types';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Global cmd-K style user search. Debounced username/display-name search
 * with inline friend-action quick buttons. Keyboard-friendly:
 *   ↑/↓ — move highlight
 *   Enter — open highlighted profile
 *   Esc — close modal
 *
 * Each result row carries the viewer's current friendship state with that
 * user so FriendActionButton renders the right label without another
 * round-trip.
 */
export function UserSearchModal({ isOpen, onClose }: UserSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Track optimistic state overrides for friendship per result id so the
  // button label updates instantly without waiting for the refetch.
  const [overrides, setOverrides] = useState<Record<string, UserFriendshipState>>({});

  // Focus input on open, clear state on close.
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setActiveIdx(0);
      setOverrides({});
      // Focus after the modal mounts so the browser doesn't steal it.
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      abortRef.current?.abort();
    }
  }, [isOpen]);

  // Debounced search.
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();
    if (trimmed.length < SOCIAL_CONFIG.USER_SEARCH_MIN_CHARS) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data = await res.json();
        setResults((data.results ?? []) as UserSearchResult[]);
        setActiveIdx(0);
      } catch (err) {
        if ((err as { name?: string }).name !== 'AbortError') {
          console.error('User search failed:', err);
        }
      } finally {
        setLoading(false);
      }
    }, SOCIAL_CONFIG.USER_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const openProfile = useCallback(
    (id: string) => {
      router.push(`/profile/${id}`);
      onClose();
    },
    [router, onClose],
  );

  // Keyboard nav — up/down/enter/esc on the input.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(results.length - 1, i + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const row = results[activeIdx];
      if (row) openProfile(row.id);
    }
  };

  const enrichedResults = useMemo(
    () =>
      results.map((r) => ({
        ...r,
        friendship: {
          ...r.friendship,
          status: overrides[r.id] ?? r.friendship.status,
        },
      })),
    [results, overrides],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="search-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-scrim backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: -8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-panel border border-edge rounded-sm shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Search users"
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-edge-faint">
              <svg className="w-4 h-4 text-ink-muted shrink-0" viewBox="0 0 20 20" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="M13 13L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search players by username…"
                className="flex-1 bg-transparent outline-none text-ink placeholder-ink-faint text-[14px]"
                autoComplete="off"
                spellCheck={false}
              />
              {loading && (
                <div className="w-4 h-4 border border-ink-muted border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            <div className="max-h-[50vh] overflow-y-auto">
              {query.trim().length < SOCIAL_CONFIG.USER_SEARCH_MIN_CHARS ? (
                <div className="px-5 py-8 text-center text-ink-faint text-[12px]">
                  Type at least {SOCIAL_CONFIG.USER_SEARCH_MIN_CHARS} characters
                </div>
              ) : enrichedResults.length === 0 && !loading ? (
                <div className="px-5 py-8 text-center text-ink-faint text-[12px]">
                  No players found
                </div>
              ) : (
                enrichedResults.map((row, i) => {
                  const active = i === activeIdx;
                  return (
                    <div
                      key={row.id}
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => openProfile(row.id)}
                      className={`
                        flex items-center gap-3 px-5 py-3 cursor-pointer
                        border-b border-edge-faint last:border-b-0
                        ${active ? 'bg-card' : ''}
                      `}
                    >
                      <Avatar user={row} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-ink truncate">
                          {row.display_name || row.username}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <RankBadge elo={row.elo_rating} size="sm" />
                          <span className="text-[11px] text-ink-faint font-mono tabular-nums">
                            {row.elo_rating}
                          </span>
                          <span className="text-[11px] text-ink-faint">
                            @{row.username}
                          </span>
                        </div>
                      </div>
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                      >
                        <FriendActionButton
                          targetUserId={row.id}
                          friendship={row.friendship.status}
                          size="sm"
                          onStateChange={(next) =>
                            setOverrides((prev) => ({ ...prev, [row.id]: next }))
                          }
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
