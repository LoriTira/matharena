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

      setChallengeUrl(`${window.location.origin}${data.url}`);
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
          title: 'MathArena Challenge',
          text: 'Think you can beat me at mental math? Accept my challenge.',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-panel border border-edge rounded-sm p-8 max-w-md w-full mx-4 max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-faint hover:text-ink-secondary transition-colors text-sm"
        >
          ✕
        </button>

        <div className="text-center mb-5">
          <h2 className="font-serif text-xl font-normal text-ink">Challenge a Friend</h2>
        </div>

        {/* Tabs */}
        {showFriendsTab && (
          <div className="flex border-b border-edge mb-5">
            <button
              onClick={() => setTab('friends')}
              className={`flex-1 pb-2.5 text-[12px] tracking-[1.5px] font-semibold transition-colors border-b-2 ${
                tab === 'friends'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:text-ink-tertiary'
              }`}
            >
              FRIENDS
            </button>
            <button
              onClick={() => setTab('link')}
              className={`flex-1 pb-2.5 text-[12px] tracking-[1.5px] font-semibold transition-colors border-b-2 ${
                tab === 'link'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:text-ink-tertiary'
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
                      className="w-full flex items-center justify-between p-3 rounded-sm border border-edge-faint hover:border-edge-strong hover:bg-card transition-colors disabled:opacity-40 text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <div className="text-[13px] text-ink-secondary truncate">
                            {friend.display_name || friend.username}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-ink-faint mt-0.5">
                            <RankBadge elo={friend.elo_rating} size="sm" />
                            <span className="font-mono tabular-nums">{friend.elo_rating}</span>
                            <span>{winRate}% win</span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-[11px] tracking-[1px] font-semibold whitespace-nowrap ${
                        isSending ? 'text-ink-faint' : 'text-accent'
                      }`}>
                        {isSending ? 'SENDING...' : 'CHALLENGE'}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <p className="text-[11px] text-ink-faint text-center mt-4">
              Players you&apos;ve matched against appear here
            </p>
          </div>
        )}

        {/* Link tab (or default if no friends) */}
        {(tab === 'link' || !showFriendsTab) && (
          <div>
            <p className="text-ink-muted text-sm mb-4 text-center">Share this link to start a match</p>

            {linkLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border border-ink-muted border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <p className="text-red-400/70 text-sm mb-4">{error}</p>
                <button
                  onClick={createLink}
                  className="px-4 py-2 border border-edge text-ink-secondary rounded-sm text-xs tracking-[1px] hover:border-edge-strong transition-colors"
                >
                  TRY AGAIN
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 bg-card border border-edge rounded-sm p-3 mb-4">
                  <span className="font-mono text-[13px] text-ink-secondary truncate flex-1">
                    {challengeUrl}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="px-4 py-1.5 bg-btn text-btn-text text-[12px] tracking-[1.5px] font-semibold rounded-sm hover:bg-btn-hover transition-colors whitespace-nowrap"
                  >
                    {copied ? 'COPIED' : 'COPY'}
                  </button>
                </div>

                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    onClick={handleShare}
                    className="w-full py-3 border border-edge text-ink-secondary text-xs tracking-[1px] rounded-sm hover:border-edge-strong hover:text-ink-secondary transition-colors"
                  >
                    SHARE
                  </button>
                )}

                <p className="text-ink-faint text-[11px] text-center mt-4">Link expires in 7 days</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
