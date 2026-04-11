'use client';

import { AnimatePresence, motion } from 'framer-motion';

interface FriendRequestBadgeProps {
  count: number;
  children: React.ReactNode;
}

/**
 * Wraps a navbar avatar (or any trigger) and overlays a small red badge
 * with the number of unread friend requests. The badge springs in on
 * 0 → N and shrinks out when the count clears.
 */
export function FriendRequestBadge({ count, children }: FriendRequestBadgeProps) {
  return (
    <div className="relative inline-flex">
      {children}
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            key="badge"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            className="
              absolute -top-1 -right-1
              min-w-[16px] h-[16px] px-1
              rounded-full bg-red-500 text-white
              flex items-center justify-center
              text-[9px] font-bold tabular-nums
              border border-page
              pointer-events-none
            "
          >
            {count > 9 ? '9+' : count}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
