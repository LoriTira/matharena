'use client';

import { useTheme, type Theme, type AccentColor } from '@/components/ThemeProvider';
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

const ACCENT_OPTIONS: { value: AccentColor; label: string; swatch: string }[] = [
  { value: 'violet', label: 'Violet', swatch: '#7C3AED' },
  { value: 'blue', label: 'Blue', swatch: '#2563EB' },
  { value: 'teal', label: 'Teal', swatch: '#0D9488' },
  { value: 'gold', label: 'Gold', swatch: '#B45309' },
];

export function ThemeSettings() {
  const { theme, accent, setTheme, setAccent } = useTheme();
  const { mode: feedbackMode, setMode: setFeedbackMode, unlock } = useSound();

  // Switching to "sound on" from this click counts as a user gesture, so
  // it's a valid moment to unlock the iOS AudioContext early. If the user
  // only ever toggles the dropdown without entering a match, this means
  // the first correct answer will still make a sound.
  const handleFeedbackOn = () => {
    unlock();
    setFeedbackMode('on');
  };

  return (
    <Dropdown
      align="right"
      trigger={
        <button
          className="p-1.5 text-ink-tertiary hover:text-ink-secondary transition-colors"
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
        {/* Theme section */}
        <div className="text-[10px] tracking-[2px] text-ink-faint mb-2">THEME</div>
        <div className="flex gap-1 mb-4">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-sm text-[11px] transition-colors ${
                theme === opt.value
                  ? 'bg-accent-subtle text-accent'
                  : 'text-ink-muted hover:text-ink-secondary hover:bg-tint'
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>

        {/* Accent section */}
        <div className="text-[10px] tracking-[2px] text-ink-faint mb-2">ACCENT</div>
        <div className="flex justify-between px-2 mb-4">
          {ACCENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setAccent(opt.value)}
              className="group flex flex-col items-center gap-1"
              aria-label={opt.label}
            >
              <div
                className={`w-6 h-6 rounded-full transition-all ${
                  accent === opt.value ? '' : 'group-hover:scale-110'
                }`}
                style={{
                  backgroundColor: opt.swatch,
                  boxShadow: accent === opt.value ? `0 0 0 2px var(--bg-raised), 0 0 0 4px ${opt.swatch}` : undefined,
                }}
              />
              <span className={`text-[9px] tracking-wider ${
                accent === opt.value ? 'text-ink-secondary' : 'text-ink-faint'
              }`}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>

        {/* Feedback section — single toggle governs both sound and haptics */}
        <div className="text-[10px] tracking-[2px] text-ink-faint mb-2">FEEDBACK</div>
        <div className="flex gap-1">
          <button
            onClick={handleFeedbackOn}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-sm text-[11px] transition-colors ${
              feedbackMode === 'on'
                ? 'bg-accent-subtle text-accent'
                : 'text-ink-muted hover:text-ink-secondary hover:bg-tint'
            }`}
          >
            Sound On
          </button>
          <button
            onClick={() => setFeedbackMode('off')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-sm text-[11px] transition-colors ${
              feedbackMode === 'off'
                ? 'bg-accent-subtle text-accent'
                : 'text-ink-muted hover:text-ink-secondary hover:bg-tint'
            }`}
          >
            Silent
          </button>
        </div>
      </div>
    </Dropdown>
  );
}
