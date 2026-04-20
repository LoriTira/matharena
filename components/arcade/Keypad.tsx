'use client';

interface KeypadProps {
  onKey: (k: string) => void;
  /** Show negative-number key. */
  allowNegative?: boolean;
  disabled?: boolean;
}

/**
 * Mobile on-screen keypad for the live duel. 3×4 grid: 7-8-9 / 4-5-6 / 1-2-3 /
 * minus-0-backspace. Fires `onKey` with the literal char: '0'..'9', '-', or
 * '⌫' for backspace.
 */
export function Keypad({ onKey, allowNegative = true, disabled = false }: KeypadProps) {
  const keys: string[] = ['7', '8', '9', '4', '5', '6', '1', '2', '3', allowNegative ? '−' : '·', '0', '⌫'];

  return (
    <div className="grid grid-cols-3 gap-[8px]">
      {keys.map((k) => {
        const isBack = k === '⌫';
        const isDisabled = disabled || k === '·';
        return (
          <button
            key={k}
            type="button"
            disabled={isDisabled}
            onClick={() => onKey(k === '−' ? '-' : k)}
            className={`aspect-[2/1] border border-edge-strong grid place-items-center font-display font-bold text-[20px] transition-colors active:bg-tint ${
              isBack ? 'bg-panel text-magenta' : 'bg-page text-ink'
            } ${isDisabled ? 'opacity-30 pointer-events-none' : 'hover:border-ink'}`}
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}
