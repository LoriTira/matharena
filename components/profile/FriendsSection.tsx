'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { RankBadge } from '@/components/ui/RankBadge';
import { useFriendships } from '@/hooks/useFriendships';
import { useToast } from '@/hooks/useToast';
import { FriendActionButton } from '@/components/profile/FriendActionButton';

interface FriendsSectionProps {
  onOpenSearch: () => void;
}

/**
 * Replaces the old "friends derived from past challenges" block. Shows:
 *   - Incoming pending friend requests (with ACCEPT / DECLINE buttons)
 *   - Accepted friends (with a CHALLENGE button + link to profile)
 *   - FIND FRIENDS CTA that opens the global search modal
 *
 * Uses useFriendships for shared state with the navbar badge so accept/
 * decline decrements the navbar count without a full refetch.
 */
export function FriendsSection({ onOpenSearch }: FriendsSectionProps) {
  const { friends, pending_incoming, loading, refetch } = useFriendships();
  const { addToast } = useToast();
  const [declining, setDeclining] = useState<string | null>(null);

  const handleDecline = async (otherUserId: string) => {
    setDeclining(otherUserId);
    try {
      const res = await fetch('/api/friends/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherUserId }),
      });
      if (res.ok) {
        addToast('Request declined', 'info');
        refetch();
      } else {
        addToast('Failed to decline request', 'error');
      }
    } catch {
      addToast('Failed to decline request', 'error');
    }
    setDeclining(null);
  };

  return (
    <div className="space-y-6">
      {/* ─── Incoming requests ─── */}
      <AnimatePresence initial={false}>
        {pending_incoming.length > 0 && (
          <motion.div
            key="requests"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-[12px] tracking-[3px] font-black text-accent">▸ REQUESTS</div>
              <div className="text-[12px] font-mono font-black text-accent tabular-nums">
                {pending_incoming.length}
              </div>
            </div>
            <div className="border-2 border-edge-strong rounded-xl overflow-hidden bg-panel">
              <AnimatePresence initial={false}>
                {pending_incoming.map((req) => (
                  <motion.div
                    key={req.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between px-5 py-3.5 border-b border-edge-faint last:border-b-0"
                  >
                    <Link
                      href={`/profile/${req.id}`}
                      className="flex items-center gap-3 min-w-0 flex-1 hover:bg-card -m-2 p-2 rounded-sm transition-colors"
                    >
                      <Avatar user={req} size="sm" />
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-ink truncate">
                          {req.display_name || req.username}
                        </div>
                        <div className="font-mono text-[11px] text-ink-faint">
                          Elo {req.elo_rating}
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <FriendActionButton
                        targetUserId={req.id}
                        friendship="pending_incoming"
                        size="sm"
                        onStateChange={() => refetch()}
                      />
                      <button
                        onClick={() => handleDecline(req.id)}
                        disabled={declining === req.id}
                        className="px-3 py-1.5 text-[11px] tracking-[1px] text-ink-muted hover:text-red-400/80 transition-colors disabled:opacity-50"
                      >
                        {declining === req.id ? '…' : 'DECLINE'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Accepted friends ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12px] tracking-[3px] font-black text-accent">▸ FRIENDS</div>
          <button
            onClick={onOpenSearch}
            className="text-[11px] tracking-[2px] font-black text-ink-tertiary hover:text-accent transition-colors"
          >
            FIND FRIENDS +
          </button>
        </div>
        {loading ? (
          <div className="text-ink-tertiary text-[13px] font-semibold">Loading…</div>
        ) : friends.length === 0 ? (
          <div className="border-2 border-dashed border-edge-strong rounded-xl p-6 text-center bg-panel">
            <div className="text-ink-tertiary text-[13px] font-semibold mb-2">No friends yet</div>
            <button
              onClick={onOpenSearch}
              className="text-[12px] tracking-[2.5px] font-black text-accent hover:text-accent-muted transition-colors"
            >
              ▸ FIND PLAYERS
            </button>
          </div>
        ) : (
          <div className="border border-edge-faint rounded-sm overflow-hidden">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between px-5 py-3.5 border-b border-edge-faint last:border-b-0"
              >
                <Link
                  href={`/profile/${friend.id}`}
                  className="flex items-center gap-3 min-w-0 flex-1 hover:bg-card -m-2 p-2 rounded-sm transition-colors"
                >
                  <Avatar user={friend} size="sm" />
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-ink truncate">
                      {friend.display_name || friend.username}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <RankBadge elo={friend.elo_rating} size="sm" />
                      <span className="font-mono text-[11px] text-ink-faint tabular-nums">
                        {friend.elo_rating}
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="shrink-0 ml-3">
                  <FriendActionButton
                    targetUserId={friend.id}
                    friendship="accepted"
                    size="sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
