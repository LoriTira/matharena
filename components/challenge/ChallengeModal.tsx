'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChallengeModal({ isOpen, onClose }: ChallengeModalProps) {
  const { addToast } = useToast();
  const [challengeUrl, setChallengeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const createChallenge = useCallback(async () => {
    setLoading(true);
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
        setLoading(false);
        return;
      }

      setChallengeUrl(`${window.location.origin}${data.url}`);
    } catch {
      setError('Failed to create challenge');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      createChallenge();
    } else {
      setChallengeUrl('');
      setCopied(false);
      setError('');
    }
  }, [isOpen, createChallenge]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-panel border border-edge rounded-sm p-8 max-w-md w-full mx-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-faint hover:text-ink-secondary transition-colors text-sm"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <h2 className="font-serif text-xl font-light text-ink">Challenge a Friend</h2>
          <p className="text-ink-muted text-sm mt-1">Share this link to start a match</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border border-ink-muted border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-red-400/70 text-sm mb-4">{error}</p>
            <button
              onClick={createChallenge}
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
                className="px-4 py-1.5 bg-btn text-btn-text text-[10px] tracking-[1.5px] font-semibold rounded-sm hover:bg-btn-hover transition-colors whitespace-nowrap"
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
    </div>
  );
}
