'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import type { UserFriendshipState } from '@/types';

interface FriendActionButtonProps {
  targetUserId: string;
  friendship: UserFriendshipState;
  size?: 'sm' | 'md';
  onStateChange?: (next: UserFriendshipState) => void;
}

/**
 * Smart adaptive button used on the public profile, the friends section,
 * and search result rows. Maps a viewer-oriented friendship state to the
 * right label + action:
 *
 *   self              → link to own editable /profile
 *   none              → SEND FRIEND REQUEST   → POST /api/friends/request
 *   pending_outgoing  → REQUEST SENT (disabled)
 *   pending_incoming  → ACCEPT                → POST /api/friends/accept
 *   accepted          → CHALLENGE             → POST /api/challenge/create + redirect
 *
 * Emits optimistic state changes via onStateChange so parent lists can
 * reflect the new state immediately; the Realtime-driven refetch in
 * useFriendships converges afterwards without flicker.
 */
export function FriendActionButton({
  targetUserId,
  friendship,
  size = 'md',
  onStateChange,
}: FriendActionButtonProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [busy, setBusy] = useState(false);

  const baseClass =
    size === 'md'
      ? 'px-4 py-2 text-[12px] tracking-[1.5px] rounded-sm transition-colors whitespace-nowrap'
      : 'px-3 py-1.5 text-[11px] tracking-[1px] rounded-sm transition-colors whitespace-nowrap';

  if (friendship === 'self') {
    return (
      <Link
        href="/profile"
        className={`${baseClass} border border-edge text-ink-muted hover:border-edge-strong hover:text-ink-secondary`}
      >
        EDIT PROFILE
      </Link>
    );
  }

  const handleSendRequest = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        addToast('Friend request sent', 'success');
        onStateChange?.('pending_outgoing');
      } else if (res.status === 429) {
        addToast('Too many friend requests — try again later', 'error');
      } else {
        const data = await res.json().catch(() => ({}));
        addToast(data.error || 'Failed to send request', 'error');
      }
    } catch {
      addToast('Failed to send request', 'error');
    }
    setBusy(false);
  };

  const handleAccept = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherUserId: targetUserId }),
      });
      if (res.ok) {
        addToast('Friend added', 'success');
        onStateChange?.('accepted');
      } else {
        addToast('Failed to accept request', 'error');
      }
    } catch {
      addToast('Failed to accept request', 'error');
    }
    setBusy(false);
  };

  const handleChallenge = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/challenge/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: targetUserId }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        router.push(data.url);
      } else {
        addToast(data.error || 'Failed to create challenge', 'error');
        setBusy(false);
      }
    } catch {
      addToast('Failed to create challenge', 'error');
      setBusy(false);
    }
  };

  if (friendship === 'none') {
    return (
      <button
        onClick={handleSendRequest}
        disabled={busy}
        className={`${baseClass} bg-accent text-on-accent font-semibold hover:bg-accent-muted disabled:opacity-50`}
      >
        {busy ? 'SENDING…' : 'SEND FRIEND REQUEST'}
      </button>
    );
  }

  if (friendship === 'pending_outgoing') {
    return (
      <button
        disabled
        className={`${baseClass} border border-edge-faint text-ink-faint cursor-not-allowed`}
      >
        REQUEST SENT
      </button>
    );
  }

  if (friendship === 'pending_incoming') {
    return (
      <button
        onClick={handleAccept}
        disabled={busy}
        className={`${baseClass} bg-accent text-on-accent font-semibold hover:bg-accent-muted disabled:opacity-50`}
      >
        {busy ? 'ACCEPTING…' : 'ACCEPT REQUEST'}
      </button>
    );
  }

  // accepted
  return (
    <button
      onClick={handleChallenge}
      disabled={busy}
      className={`${baseClass} bg-accent text-on-accent font-semibold hover:bg-accent-muted disabled:opacity-50`}
    >
      {busy ? 'SENDING…' : 'CHALLENGE'}
    </button>
  );
}
