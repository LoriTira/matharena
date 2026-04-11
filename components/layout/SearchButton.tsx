'use client';

import { useEffect } from 'react';

interface SearchButtonProps {
  onOpen: () => void;
  className?: string;
  label?: string;
}

/**
 * Small icon button that triggers the global UserSearchModal. Also owns the
 * ⌘K / Ctrl+K keyboard shortcut listener — parent mounts one instance next
 * to the navbar and the shortcut works from anywhere in the app.
 */
export function SearchButton({
  onOpen,
  className = '',
  label = 'Search players',
}: SearchButtonProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isK = e.key === 'k' || e.key === 'K';
      if (!isK) return;
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpen]);

  return (
    <button
      onClick={onOpen}
      aria-label={label}
      className={`p-1.5 text-ink-muted hover:text-ink-secondary transition-colors ${className}`}
      title="⌘K"
    >
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M13 13L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}
