'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { RankBadge } from '@/components/ui/RankBadge';

interface Friend {
  id: string;
  username: string;
  display_name: string | null;
  elo_rating: number;
  games_played: number;
  games_won: number;
}

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'friends' | 'link';

export function ChallengeModal({ isOpen, onClose }: ChallengeModalProps) {
  const { addToast } = useToast();
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [challengeUrl, setChallengeUrl] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    setFriendsLoading(true);
    try {
      const res = await fetch('/api/friends');
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends ?? []);
      }
    } catch {
      // Silently fail
    }
    setFriendsLoading(false);
  }, []);

  const createLink = useCallback(async () => {
    setLinkLoading(true);
    setError('');
    setCopied(false);

    try {
      const res = await fetch('/api/challenge/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create challenge');
        setLinkLoading(false);
        return;
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      setChallengeUrl(`${appUrl}${data.url}`);
    } catch {
      setError('Failed to create challenge');
    }

    setLinkLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
      setChallengeUrl('');
      setCopied(false);
      setError('');
      setSendingTo(null);
      // Default to friends tab if there are friends, otherwise link
      setTab('friends');
    }
  }, [isOpen, fetchFriends]);

  // Switch to link tab: create link if not already created
  useEffect(() => {
    if (isOpen && tab === 'link' && !challengeUrl && !linkLoading && !error) {
      createLink();
    }
  }, [isOpen, tab, challengeUrl, linkLoading, error, createLink]);

  // Auto-switch to link tab when user has no friends
  useEffect(() => {
    if (isOpen && !friendsLoading && friends.length === 0 && tab === 'friends') {
      setTab('link');
    }
  }, [isOpen, friendsLoading, friends.length, tab]);

  const handleChallengeFriend = async (friend: Friend) => {
    setSendingTo(friend.id);
    try {
      const res = await fetch('/api/challenge/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: friend.id }),
      });

      if (res.ok) {
        addToast(`Challenge sent to ${friend.display_name || friend.username}!`, 'success');
        onClose();
        // Stay on dashboard — challenge will appear in the challenges card
        // once the friend accepts via the email link
      } else {
        const data = await res.json();
        addToast(data.error || 'Failed to send challenge', 'error');
      }
    } catch {
      addToast('Failed to send challenge', 'error');
    }
    setSendingTo(null);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(challengeUrl);
      setCopied(true);
      addToast('Challenge link copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = challengeUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      addToast('Challenge link copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MathsArena Challenge',
          text: 'Think you can beat me at mental math? Match me.',
          url: challengeUrl,
        });
      } catch {
        // User cancelled share
      }
    }
  };

  if (!isOpen) return null;

  // If no friends loaded yet and still loading, default to friends tab
  // Once loaded, if empty, switch to link tab
  const showFriendsTab = friendsLoading || friends.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-panel border-2 border-edge-strong rounded-xl p-6 sm:p-8 w-[calc(100%-1rem)] sm:w-full max-w-md max-h-[85vh] flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.4)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-tertiary hover:text-ink transition-colors text-lg font-black w-8 h-8 flex items-center justify-center rounded-md hover:bg-shade"
        >
          ✕
        </button>

        <div className="text-center mb-5">
          <div className="text-[11px] tracking-[4px] font-black text-accent mb-2">▸ CHALLENGE</div>
          <h2 className="font-serif text-2xl sm:text-3xl font-black text-ink leading-none tracking-tight">Challenge a friend.</h2>
        </div>

        {/* Tabs */}
        {showFriendsTab && (
          <div className="flex border-b-2 border-edge-strong mb-5">
            <button
              onClick={() => setTab('friends')}
              className={`flex-1 pb-3 text-[12px] tracking-[2.5px] font-black transition-colors border-b-[3px] -mb-[2px] ${
                tab === 'friends'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-tertiary hover:text-ink'
              }`}
            >
              FRIENDS
            </button>
            <button
              onClick={() => setTab('link')}
              className={`flex-1 pb-3 text-[12px] tracking-[2.5px] font-black transition-colors border-b-[3px] -mb-[2px] ${
                tab === 'link'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-tertiary hover:text-ink'
              }`}
            >
              SEND LINK
            </button>
          </div>
        )}

        {/* Friends tab */}
        {tab === 'friends' && showFriendsTab && (
          <div className="overflow-y-auto flex-1 -mx-2 px-2">
            {friendsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border border-ink-muted border-t-transparent rounded-full animate-spin" />
              </div>
            ) : friends.length > 0 ? (
              <div className="space-y-1.5">
                {friends.map((friend) => {
                  const winRate = friend.games_played > 0
                    ? Math.round((friend.games_won / friend.games_played) * 100)
                    : 0;
                  const isSending = sendingTo === friend.id;

                  return (
                    <button
                      key={friend.id}
                      onClick={() => handleChallengeFriend(friend)}
                      disabled={sendingTo !== null}
                      className="w-full flex items-center justify-between p-3.5 rounded-md border-2 border-edge-strong hover:border-accent hover:bg-accent-glow transition-all disabled:opacity-40 text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <div className="text-[14px] font-bold text-ink truncate">
                            {friend.display_name || friend.username}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-bold text-ink-tertiary mt-1">
                            <RankBadge elo={friend.elo_rating} size="sm" />
                            <span className="font-mono tabular-nums font-black">{friend.elo_rating}</span>
                            <span>{winRate}% win</span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-[11px] tracking-[2px] font-black whitespace-nowrap ${
                        isSending ? 'text-ink-faint' : 'text-accent'
                      }`}>
                        {isSending ? 'SENDING...' : '▸ CHALLENGE'}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <p className="text-[11px] font-semibold text-ink-tertiary text-center mt-4">
              Players you&apos;ve matched against appear here
            </p>
          </div>
        )}

        {/* Link tab (or default if no friends) */}
        {(tab === 'link' || !showFriendsTab) && (
          <div>
            <p className="text-ink-tertiary text-[13px] font-semibold mb-4 text-center">Share this link to start a match</p>

            {linkLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <p className="text-feedback-wrong text-[13px] font-semibold mb-4">{error}</p>
                <button
                  onClick={createLink}
                  className="px-5 py-2.5 border-2 border-edge-strong text-ink font-black rounded-md text-[12px] tracking-[2.5px] hover:border-edge-bold hover:bg-shade transition-colors"
                >
                  TRY AGAIN
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 bg-card border-2 border-edge-strong rounded-md p-3 mb-4">
                  <span className="font-mono text-[12px] font-bold text-ink-secondary truncate flex-1">
                    {challengeUrl}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2 bg-accent text-on-accent text-[11px] tracking-[2px] font-black rounded-md hover:scale-[1.02] transition-all whitespace-nowrap shadow-[0_4px_16px_var(--accent-glow)]"
                  >
                    {copied ? '✓ COPIED' : 'COPY'}
                  </button>
                </div>

                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    onClick={handleShare}
                    className="w-full py-3 border-2 border-edge-strong text-ink font-black text-[12px] tracking-[2.5px] rounded-md hover:border-edge-bold hover:bg-shade transition-colors"
                  >
                    ▸ SHARE
                  </button>
                )}

                <p className="text-ink-tertiary text-[11px] font-semibold text-center mt-4">Link expires in 7 days</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
