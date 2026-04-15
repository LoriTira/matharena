'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { getRank, didRankChange, TIERS } from '@/lib/ranks';
import { RankBadge } from '@/components/ui/RankBadge';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';

interface MatchResultProps {
  won: boolean;
  myScore: number;
  theirScore: number;
  targetScore: number;
  eloBefore: number;
  eloAfter: number;
  penalties: number;
  opponentName: string;
  opponentElo?: number;
  onRematch?: () => void;
  avgTimeMs?: number;
  accuracy?: number;
  fastestSolveMs?: number;
  totalPenalties?: number;
  newAchievements?: { id: string; name: string; description: string; icon: string; rarity: string }[];
  opponentId?: string;
  matchId?: string;
}

function VictoryBurst() {
  const rays = 8;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {Array.from({ length: rays }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-[2px] h-32 origin-bottom"
          style={{
            rotate: `${(360 / rays) * i}deg`,
            background: 'linear-gradient(to top, transparent, rgba(245, 158, 11, 0.4), transparent)',
          }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: [0, 1.5, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: 1.2, delay: 0.1 + i * 0.05, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

function AnimatedNumber({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (value - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{display}</>;
}

function formatTime(ms: number): string {
  if (ms < 1000) return `0.${Math.round(ms / 100)}s`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getNextTierName(elo: number): string | null {
  for (const tier of TIERS) {
    if (elo >= tier.min && elo <= tier.max) {
      if (tier.max === Infinity) return null; // Grandmaster
      const idx = TIERS.indexOf(tier);
      if (idx < TIERS.length - 1) return TIERS[idx + 1].name;
      return null;
    }
  }
  return null;
}

export function MatchResult({
  won,
  myScore,
  theirScore,
  targetScore,
  eloBefore,
  eloAfter,
  penalties,
  opponentName,
  opponentElo,
  onRematch,
  avgTimeMs,
  accuracy,
  fastestSolveMs,
  totalPenalties,
  newAchievements,
  opponentId,
  matchId,
}: MatchResultProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const prefersReducedMotion = useReducedMotion();
  const eloChange = eloAfter - eloBefore;
  const rankedUp = didRankChange(eloBefore, eloAfter) && eloAfter > eloBefore;
  const newRank = getRank(eloAfter);
  const winsToRecover = eloChange < 0 ? Math.max(1, Math.ceil(Math.abs(eloChange) / 20)) : 0;
  const [rematchLoading, setRematchLoading] = useState(false);
  const [incomingRematchCode, setIncomingRematchCode] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Victory confetti — fires once on mount when `won === true`, in 3 staggered
  // bursts from the center + left edge + right edge. Respects reduced-motion
  // (in which case the existing VictoryBurst rays remain as the fallback).
  // Lazy-imports canvas-confetti so it only lands in the bundle when a match
  // actually completes with a win.
  useEffect(() => {
    if (!won) return;
    if (typeof window === 'undefined') return;
    if (prefersReducedMotion) return;

    let cancelled = false;
    import('canvas-confetti').then(({ default: confetti }) => {
      if (cancelled) return;
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, scalar: 0.9 });
      setTimeout(() => {
        if (!cancelled) confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 } });
      }, 180);
      setTimeout(() => {
        if (!cancelled) confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 } });
      }, 360);
    }).catch(() => { /* swallow — confetti must never crash the results screen */ });

    return () => { cancelled = true; };
  }, [won, prefersReducedMotion]);

  // Poll for incoming rematch from opponent
  useEffect(() => {
    if (!user || !opponentId) return;

    const check = async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('challenges')
        .select('code')
        .eq('sender_id', opponentId)
        .eq('recipient_id', user.id)
        .eq('status', 'accepted')
        .is('match_id', null)
        .gte('created_at', fiveMinAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setIncomingRematchCode(data.code);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    };

    check();
    pollRef.current = setInterval(check, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user, opponentId, supabase]);

  const nextTierName = getNextTierName(eloAfter);
  const ptsToNext = newRank.nextTierElo - eloAfter;

  const handleShare = async () => {
    const text = won
      ? `Beat ${opponentName} ${myScore}-${theirScore} on MathsArena. Rating ${eloAfter}.`
      : `Lost to ${opponentName} ${theirScore}-${myScore} on MathsArena. Running it back. Rating ${eloAfter}.`;

    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  const handleRematch = async () => {
    if (!opponentId) return;
    setRematchLoading(true);
    try {
      const res = await fetch('/api/challenge/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: opponentId, rematch: true }),
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = `/challenge/${data.challenge.code}/lobby`;
      }
    } catch {
      // fallback — silently fail
    } finally {
      setRematchLoading(false);
    }
  };

  const hasStats = avgTimeMs !== undefined;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 relative">
      {/* Victory burst — only used as the reduced-motion fallback; when motion
          is allowed, the canvas-confetti useEffect above carries the load. */}
      {won && prefersReducedMotion && <VictoryBurst />}

      {/* Result heading */}
      <motion.div
        className={`font-serif text-5xl md:text-6xl font-normal ${won ? 'text-accent' : 'text-ink-tertiary'}`}
        initial={{ scale: won ? 0.5 : 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={won ? { type: 'spring', stiffness: 200, damping: 15, delay: 0.3 } : { duration: 0.8, delay: 0.2 }}
      >
        {won ? 'Victory' : 'Defeat'}
      </motion.div>

      {/* Opponent info */}
      <motion.div
        className="text-[13px] text-ink-muted flex items-center gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {won ? `You crushed ${opponentName}` : `${opponentName} got you`}
        {opponentElo && (
          <span className="inline-flex items-center gap-1 ml-1">
            <RankBadge elo={opponentElo} size="sm" />
            <span className="font-mono text-ink-faint">{opponentElo}</span>
          </span>
        )}
      </motion.div>

      {/* Score */}
      <motion.div
        className="font-mono text-4xl font-medium text-ink tabular-nums"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <AnimatedNumber value={myScore} duration={0.8} />
        <span className="text-ink-faint mx-2">&ndash;</span>
        <AnimatedNumber value={theirScore} duration={0.8} />
        <span className="text-ink-faint text-lg ml-2">/ {targetScore}</span>
      </motion.div>

      {/* Elo change */}
      <motion.div
        className="flex flex-col items-center gap-1"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
      >
        <div className={`font-mono text-3xl font-medium tabular-nums ${eloChange >= 0 ? 'text-accent' : 'text-red-400/60'}`}>
          {eloChange >= 0 ? '+' : ''}<AnimatedNumber value={eloChange} duration={1.2} /> Elo
        </div>
        <div className="text-ink-faint text-sm font-mono tabular-nums flex items-center gap-2">
          {eloBefore} &rarr; {eloAfter}
          <RankBadge elo={eloAfter} size="sm" showLabel />
        </div>
      </motion.div>

      {/* Rating progress bar */}
      <motion.div
        className="w-full max-w-xs flex flex-col gap-1.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
      >
        <div className="h-1.5 w-full rounded-full bg-shade overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: newRank.color }}
            initial={{ width: '0%' }}
            animate={{ width: `${newRank.progress * 100}%` }}
            transition={{ delay: 1.2, duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="text-[12px] text-ink-faint text-center font-mono">
          {newRank.tier === 'Grandmaster'
            ? 'Grandmaster'
            : nextTierName
              ? `${ptsToNext} pts to ${nextTierName}`
              : ''
          }
        </div>
      </motion.div>

      {/* Rank up */}
      <AnimatePresence>
        {rankedUp && (
          <motion.div
            className="px-6 py-3 rounded-sm border border-accent/30 bg-accent-glow flex items-center gap-3"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.4, type: 'spring', stiffness: 200 }}
          >
            <span className="text-[12px] tracking-[2px] text-accent font-semibold">RANK UP!</span>
            <RankBadge elo={eloAfter} size="lg" showLabel />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Performance stats */}
      {hasStats && (
        <motion.div
          className="grid grid-cols-2 gap-[1px] w-full max-w-xs bg-shade rounded-sm overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
        >
          {[
            { label: 'PACE', value: formatTime(avgTimeMs!) },
            { label: 'ACCURACY', value: accuracy !== undefined ? `${Math.round(accuracy)}%` : '—' },
            { label: 'SLIPS', value: totalPenalties !== undefined ? String(totalPenalties) : '—' },
            { label: 'LIGHTNING', value: fastestSolveMs !== undefined ? formatTime(fastestSolveMs) : '—' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="bg-page px-4 py-3 flex flex-col items-center gap-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 + i * 0.08 }}
            >
              <div className="text-[8px] tracking-[1.5px] text-ink-muted">{stat.label}</div>
              <div className="font-mono text-[15px] text-ink-secondary tabular-nums">{stat.value}</div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Penalties (only if no stats section) */}
      {!hasStats && penalties > 0 && (
        <motion.div
          className="text-ink-faint text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          {penalties} wrong {penalties === 1 ? 'answer' : 'answers'}
        </motion.div>
      )}

      {/* Motivational copy for losses */}
      {!won && winsToRecover > 0 && (
        <motion.div
          className="text-ink-muted text-[13px] font-normal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
        >
          {winsToRecover === 1 ? 'One more win to recover it.' : `${winsToRecover} wins to recover.`}
        </motion.div>
      )}

      {/* Achievement unlocks */}
      {newAchievements && newAchievements.length > 0 && (
        <motion.div
          className="flex flex-col items-center gap-3 w-full max-w-sm"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6 }}
        >
          <div className="text-[11px] tracking-[2px] text-accent">
            {newAchievements.length === 1 ? 'ACHIEVEMENT UNLOCKED' : 'ACHIEVEMENTS UNLOCKED'}
          </div>
          {newAchievements.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.8 + i * 0.2 }}
              className="w-full border border-accent/20 bg-accent-glow rounded-sm px-4 py-3 flex items-center gap-3"
            >
              <span className="text-2xl">{a.icon}</span>
              <div>
                <div className="text-sm text-ink font-medium">{a.name}</div>
                <div className="text-[11px] text-ink-muted">{a.description}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        className="flex flex-wrap items-center justify-center gap-3 mt-4"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
      >
        {opponentId && (
          incomingRematchCode ? (
            <a
              href={`/challenge/${incomingRematchCode}/lobby`}
              className="px-12 py-4 font-semibold text-sm tracking-[2px] rounded-sm transition-colors bg-accent text-on-accent hover:bg-accent-muted animate-pulse"
            >
              JOIN REMATCH
            </a>
          ) : (
            <button
              onClick={handleRematch}
              disabled={rematchLoading}
              className="px-12 py-4 font-semibold text-sm tracking-[2px] rounded-sm transition-colors bg-btn text-btn-text hover:bg-btn-hover disabled:opacity-40"
            >
              {rematchLoading ? 'CREATING...' : 'REMATCH'}
            </button>
          )
        )}

        {matchId && (
          <Link
            href={`/play/${matchId}/analysis`}
            className="px-6 py-3 border border-edge text-ink-tertiary text-xs tracking-[1.5px] rounded-sm transition-colors hover:border-edge-strong hover:text-ink-secondary"
          >
            GAME ANALYSIS
          </Link>
        )}

        <Link
          href="/play"
          className="px-6 py-3 border border-edge text-ink-tertiary text-xs tracking-[1.5px] rounded-sm transition-colors hover:border-edge-strong hover:text-ink-secondary"
        >
          PLAY AGAIN
        </Link>

        <button
          onClick={handleShare}
          className="px-5 py-3 text-ink-muted text-[12px] tracking-[1.5px] rounded-sm transition-colors hover:text-ink-tertiary"
        >
          SHARE
        </button>

        <Link
          href="/dashboard"
          className="px-5 py-3 text-ink-muted text-[12px] tracking-[1.5px] rounded-sm transition-colors hover:text-ink-tertiary"
        >
          DASHBOARD
        </Link>
      </motion.div>
    </div>
  );
}
