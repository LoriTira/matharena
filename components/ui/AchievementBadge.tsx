'use client';

import type { AchievementDef } from '@/types';

const rarityStyles = {
  common: {
    border: 'border-white/[0.08]',
    glow: '',
    label: 'text-white/30',
    labelText: 'COMMON',
  },
  rare: {
    border: 'border-blue-400/30',
    glow: 'shadow-[0_0_12px_rgba(96,165,250,0.06)]',
    label: 'text-blue-400/60',
    labelText: 'RARE',
  },
  epic: {
    border: 'border-purple-400/30',
    glow: 'shadow-[0_0_12px_rgba(192,132,252,0.08)]',
    label: 'text-purple-400/60',
    labelText: 'EPIC',
  },
  legendary: {
    border: 'border-amber-400/30',
    glow: 'shadow-[0_0_16px_rgba(251,191,36,0.1)]',
    label: 'text-amber-400/70',
    labelText: 'LEGENDARY',
  },
};

interface AchievementBadgeProps {
  achievement: AchievementDef;
  unlocked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AchievementBadge({ achievement, unlocked = false, size = 'md', className = '' }: AchievementBadgeProps) {
  const rarity = rarityStyles[achievement.rarity];

  if (size === 'sm') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border ${
          unlocked ? rarity.border : 'border-white/[0.04]'
        } ${unlocked ? '' : 'opacity-40 grayscale'} ${className}`}
        title={unlocked ? `${achievement.name}: ${achievement.description}` : 'Locked'}
      >
        <span className="text-sm">{unlocked ? achievement.icon : '?'}</span>
        <span className="text-[10px] text-white/50">{unlocked ? achievement.name : '???'}</span>
      </span>
    );
  }

  if (size === 'lg') {
    return (
      <div
        className={`flex flex-col items-center gap-3 p-6 rounded-sm border ${
          unlocked ? `${rarity.border} ${rarity.glow}` : 'border-white/[0.04]'
        } ${unlocked ? '' : 'opacity-30 grayscale'} ${className}`}
      >
        <span className="text-4xl">{unlocked ? achievement.icon : '?'}</span>
        <div className="text-center">
          <div className="text-[13px] text-white/80 font-medium">{unlocked ? achievement.name : '???'}</div>
          <div className="text-[11px] text-white/30 mt-1">{unlocked ? achievement.description : 'Keep playing to unlock'}</div>
        </div>
        {unlocked && (
          <span className={`text-[8px] tracking-[2px] font-semibold ${rarity.label}`}>
            {rarity.labelText}
          </span>
        )}
      </div>
    );
  }

  // md (default)
  return (
    <div
      className={`flex items-center gap-3 p-3.5 rounded-sm border ${
        unlocked ? `${rarity.border} ${rarity.glow}` : 'border-white/[0.04]'
      } ${unlocked ? '' : 'opacity-30 grayscale'} ${className}`}
    >
      <span className="text-2xl flex-shrink-0 w-8 text-center">{unlocked ? achievement.icon : '?'}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-white/70 font-medium truncate">{unlocked ? achievement.name : '???'}</span>
          {unlocked && (
            <span className={`text-[7px] tracking-[1.5px] font-semibold flex-shrink-0 ${rarity.label}`}>
              {rarity.labelText}
            </span>
          )}
        </div>
        <div className="text-[11px] text-white/25 mt-0.5 truncate">
          {unlocked ? achievement.description : 'Keep playing to unlock'}
        </div>
      </div>
    </div>
  );
}
