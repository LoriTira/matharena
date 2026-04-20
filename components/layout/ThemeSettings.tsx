'use client';

import { useTheme, type Theme } from '@/components/ThemeProvider';
import { Dropdown } from '@/components/ui/Dropdown';
import { useSound } from '@/hooks/useSound';

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: 'light',
    label: 'Light',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
  {
    value: 'system',
    label: 'System',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
];

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const { mode: feedbackMode, setMode: setFeedbackMode, unlock } = useSound();

  const handleFeedbackOn = () => {
    unlock();
    setFeedbackMode('on');
  };

  return (
    <Dropdown
      align="right"
      trigger={
        <button
          className="p-1.5 text-ink-tertiary hover:text-ink transition-colors"
          aria-label="Theme settings"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      }
    >
      <div className="p-3 w-56">
        <div className="text-[10px] tracking-[2px] text-ink-faint mb-2 font-mono">THEME</div>
        <div className="flex gap-1 mb-4">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] border transition-colors ${
                theme === opt.value
                  ? 'border-cyan text-cyan bg-accent-glow'
                  : 'border-edge text-ink-muted hover:text-ink hover:border-edge-strong'
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>

        <div className="text-[10px] tracking-[2px] text-ink-faint mb-2 font-mono">FEEDBACK</div>
        <div className="flex gap-1">
          <button
            onClick={handleFeedbackOn}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] border transition-colors ${
              feedbackMode === 'on'
                ? 'border-cyan text-cyan bg-accent-glow'
                : 'border-edge text-ink-muted hover:text-ink hover:border-edge-strong'
            }`}
          >
            Sound On
          </button>
          <button
            onClick={() => setFeedbackMode('off')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] border transition-colors ${
              feedbackMode === 'off'
                ? 'border-cyan text-cyan bg-accent-glow'
                : 'border-edge text-ink-muted hover:text-ink hover:border-edge-strong'
            }`}
          >
            Silent
          </button>
        </div>
      </div>
    </Dropdown>
  );
}
