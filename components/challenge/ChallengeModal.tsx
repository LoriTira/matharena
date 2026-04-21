'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { RankPip } from '@/components/arcade/RankPip';
import { Btn } from '@/components/arcade/Btn';
import { getRank } from '@/lib/ranks';
import { type Tier } from '@/components/arcade/tokens';

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

function tierToArcade(tier: string): Tier {
  switch (tier) {
    case 'Bronze':      return 'Bronze';
    case 'Silver':      return 'Silver';
    case 'Gold':        return 'Gold';
    case 'Platinum':    return 'Platinum';
    case 'Diamond':     return 'Diamond';
    case 'Grandmaster': return 'Grand';
    default:            return 'Wood';
  }
}

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
    } catch {}
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
      setError('');
      setCopied(false);
      setTab('friends');
    }
  }, [isOpen, fetchFriends]);

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
        addToast(`Challenge sent to ${friend.display_name || friend.username}`, 'success');
        onClose();
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
      addToast('Challenge link copied', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = challengeUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      addToast('Challenge link copied', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MathsArena Challenge',
          text: 'Think you can beat me at mental math?',
          url: challengeUrl,
        });
      } catch {}
    }
  };

  if (!isOpen) return null;

  const showFriendsTab = friendsLoading || friends.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative bg-panel border border-edge-strong max-w-[420px] w-full mx-4 max-h-[85vh] flex flex-col"
        style={{ boxShadow: '0 0 30px rgba(54,228,255,0.15)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-[14px] right-[14px] text-ink-faint hover:text-magenta transition-colors font-mono text-[14px] leading-none"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="text-center pt-[28px] pb-[6px] px-6">
          <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[2px] mb-[8px]">
            ⚔ Challenge
          </div>
          <h2 className="font-display font-extrabold text-[24px] md:text-[28px] tracking-[-0.6px] text-ink">
            Challenge a <span className="text-cyan italic">friend.</span>
          </h2>
        </div>

        {/* Tabs */}
        {showFriendsTab && (
          <div className="flex border-b border-edge mx-6 mt-[18px]">
            <button
              onClick={() => setTab('friends')}
              className={`flex-1 pb-[10px] font-mono text-[11px] uppercase tracking-[1.4px] font-bold transition-colors border-b-2 ${
                tab === 'friends'
                  ? 'border-cyan text-cyan'
                  : 'border-transparent text-ink-tertiary hover:text-ink'
              }`}
            >
              Friends
            </button>
            <button
              onClick={() => setTab('link')}
              className={`flex-1 pb-[10px] font-mono text-[11px] uppercase tracking-[1.4px] font-bold transition-colors border-b-2 ${
                tab === 'link'
                  ? 'border-cyan text-cyan'
                  : 'border-transparent text-ink-tertiary hover:text-ink'
              }`}
            >
              Send link
            </button>
          </div>
        )}

        {/* Friends tab */}
        {tab === 'friends' && showFriendsTab && (
          <div className="overflow-y-auto flex-1 px-6 py-[18px]">
            {friendsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border border-cyan border-t-transparent rounded-full animate-spin" />
              </div>
            ) : friends.length > 0 ? (
              <div className="flex flex-col gap-[8px]">
                {friends.map((friend) => {
                  const winRate =
                    friend.games_played > 0
                      ? Math.round((friend.games_won / friend.games_played) * 100)
                      : 0;
                  const isSending = sendingTo === friend.id;
                  const tier = tierToArcade(getRank(friend.elo_rating).tier);

                  return (
                    <button
                      key={friend.id}
                      onClick={() => handleChallengeFriend(friend)}
                      disabled={sendingTo !== null}
                      className="w-full flex items-center justify-between px-[12px] py-[10px] border border-edge bg-page hover:border-cyan transition-colors disabled:opacity-40 text-left"
                    >
                      <div className="flex items-center gap-[10px] min-w-0">
                        <RankPip tier={tier} size={22} />
                        <div className="min-w-0">
                          <div className="font-display font-semibold text-[13px] text-ink truncate">
                            {friend.display_name || friend.username}
                          </div>
                          <div className="font-mono text-[10px] text-ink-tertiary uppercase tracking-[1.2px] mt-[2px]">
                            {friend.elo_rating} Elo
                            {friend.games_played > 0 && <> · {winRate}% win</>}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`font-mono text-[10px] uppercase tracking-[1.4px] font-bold whitespace-nowrap ${
                          isSending ? 'text-ink-faint' : 'text-cyan'
                        }`}
                      >
                        {isSending ? 'Sending…' : 'Challenge'}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <p className="font-mono text-[10px] text-ink-faint text-center uppercase tracking-[1.2px] mt-[14px]">
              Friends you&apos;ve matched against appear here
            </p>
          </div>
        )}

        {/* Link tab */}
        {(tab === 'link' || !showFriendsTab) && (
          <div className="px-6 py-[18px]">
            <p className="font-mono text-[11px] text-ink-tertiary uppercase tracking-[1.2px] mb-[14px] text-center">
              Share this link to start a match
            </p>

            {linkLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border border-cyan border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <p className="font-mono text-[11px] text-magenta mb-[14px]">{error}</p>
                <Btn size="sm" variant="ghost" onClick={createLink}>
                  Try again
                </Btn>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 bg-page border border-edge-strong p-[10px] mb-[14px]">
                  <span className="font-mono text-[12px] text-ink truncate flex-1">
                    {challengeUrl}
                  </span>
                  <Btn size="sm" variant="primary" onClick={handleCopy}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </Btn>
                </div>

                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <Btn size="md" variant="ghost" full onClick={handleShare}>
                    Share
                  </Btn>
                )}

                <p className="font-mono text-[10px] text-ink-faint uppercase tracking-[1.2px] text-center mt-[14px]">
                  Link expires in 7 days
                </p>
              </>
            )}
          </div>
        )}

        <div className="h-[12px]" />
      </div>
    </div>
  );
}
