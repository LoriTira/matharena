'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { getRank, didRankChange, TIERS } from '@/lib/ranks';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Panel } from '@/components/arcade/Panel';
import { Btn } from '@/components/arcade/Btn';
import { Bar } from '@/components/arcade/Bar';
import { BigNum } from '@/components/arcade/BigNum';
import { RankPip } from '@/components/arcade/RankPip';
import { SectionHead } from '@/components/arcade/SectionHead';
import { Tag } from '@/components/arcade/Tag';
import { type Tier } from '@/components/arcade/tokens';

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

function AnimatedNumber({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
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
      if (tier.max === Infinity) return null;
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
  const arcadeTier = tierToArcade(newRank.tier);
  const winsToRecover = eloChange < 0 ? Math.max(1, Math.ceil(Math.abs(eloChange) / 20)) : 0;
  const [rematchLoading, setRematchLoading] = useState(false);
  const [incomingRematchCode, setIncomingRematchCode] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!won) return;
    if (typeof window === 'undefined') return;
    if (prefersReducedMotion) return;

    let cancelled = false;
    import('canvas-confetti').then(({ default: confetti }) => {
      if (cancelled) return;
      const neon = ['#36e4ff', '#ff2a7f', '#ffd23f', '#a6ff4d'];
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, scalar: 0.9, colors: neon });
      setTimeout(() => {
        if (!cancelled) confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors: neon });
      }, 180);
      setTimeout(() => {
        if (!cancelled) confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors: neon });
      }, 360);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [won, prefersReducedMotion]);

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
      try { await navigator.share({ text }); } catch {}
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
    } catch {} finally {
      setRematchLoading(false);
    }
  };

  const hasStats = avgTimeMs !== undefined;

  return (
    <div className="flex flex-col items-center gap-6 py-6 md:py-10">
      {/* Victory/defeat banner */}
      <motion.div
        initial={{ scale: won ? 0.5 : 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={won ? { type: 'spring', stiffness: 200, damping: 15, delay: 0.2 } : { duration: 0.6, delay: 0.2 }}
      >
        <Tag color={won ? 'lime' : 'magenta'} className="text-[11px] px-[14px] py-[6px] tracking-[2px]">
          ◆ {won ? 'Victory' : 'Defeat'}
        </Tag>
      </motion.div>

      {/* Score */}
      <motion.div
        className="font-display font-extrabold text-[56px] md:text-[120px] leading-[0.95] tracking-[-4px] text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <span className="text-cyan">{myScore}</span>
        <span className="text-ink-tertiary mx-[0.15em]">—</span>
        <span className="text-magenta">{theirScore}</span>
      </motion.div>

      <motion.div
        className="font-mono text-[12px] text-ink-tertiary uppercase tracking-[1.6px]"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        vs {opponentName}{opponentElo ? ` · ${opponentElo}` : ''} · first to {targetScore}
      </motion.div>

      {/* Elo money shot */}
      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Panel padding={32} className="text-center">
          <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[2px] mb-[14px]">
            Rating change
          </div>
          <div className="flex flex-wrap justify-center items-baseline gap-4 md:gap-5">
            <BigNum n={eloBefore} color="ink-dim" size={40} />
            <span className={`font-mono text-[14px] md:text-[20px] ${eloChange >= 0 ? 'text-lime' : 'text-magenta'}`}>
              →
            </span>
            <span
              className="font-display font-extrabold leading-none tabular-nums text-cyan"
              style={{ fontSize: 72, letterSpacing: -72 * 0.03 }}
            >
              <AnimatedNumber value={eloAfter} duration={1.2} />
            </span>
            <span
              className="font-display font-extrabold text-[28px] md:text-[40px]"
              style={{
                color: eloChange >= 0 ? 'var(--neon-lime)' : 'var(--neon-magenta)',
                textShadow: `0 0 20px ${eloChange >= 0 ? 'rgba(166,255,77,0.5)' : 'rgba(255,42,127,0.5)'}`,
              }}
            >
              {eloChange >= 0 ? '+' : ''}<AnimatedNumber value={eloChange} duration={1.2} />
            </span>
          </div>
          <div className="mt-[18px] max-w-[420px] mx-auto">
            <Bar progress={newRank.progress} color="cyan" height={8} />
            <div className="mt-[6px] font-mono text-[10px] text-ink-faint uppercase tracking-[1.2px] flex items-center justify-center gap-2">
              <RankPip tier={arcadeTier} size={14} />
              <span>{newRank.name}</span>
              {nextTierName && <span>· {ptsToNext} pts to {nextTierName}</span>}
              {!nextTierName && <span>· Grandmaster</span>}
            </div>
          </div>
        </Panel>
      </motion.div>

      {/* Rank up banner */}
      <AnimatePresence>
        {rankedUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2, type: 'spring', stiffness: 200 }}
            className="px-6 py-3 border border-gold bg-accent-glow flex items-center gap-3 animate-gold-pulse"
          >
            <span className="font-mono text-[12px] tracking-[2.4px] text-gold font-bold">★ RANK UP ★</span>
            <RankPip tier={arcadeTier} size={28} showLabel />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats grid */}
      {hasStats && (
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-[1px] w-full max-w-2xl bg-edge"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          {[
            { label: 'ACCURACY', value: accuracy !== undefined ? `${Math.round(accuracy)}%` : '—', color: 'text-cyan' },
            { label: 'AVG SPEED', value: formatTime(avgTimeMs!), color: 'text-gold' },
            { label: 'LIGHTNING', value: fastestSolveMs !== undefined ? formatTime(fastestSolveMs) : '—', color: 'text-lime' },
            { label: 'SLIPS', value: totalPenalties !== undefined ? String(totalPenalties) : String(penalties), color: 'text-magenta' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="bg-panel px-4 py-4 flex flex-col gap-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 + i * 0.06 }}
            >
              <div className="font-mono text-[10px] tracking-[1.4px] text-ink-faint uppercase">{stat.label}</div>
              <div className={`font-display font-bold text-[22px] tabular-nums ${stat.color}`}>{stat.value}</div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Loss recovery */}
      {!won && winsToRecover > 0 && (
        <motion.div
          className="font-mono text-[12px] text-ink-tertiary uppercase tracking-[1.4px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
        >
          {winsToRecover === 1 ? '▸ one more win to recover it' : `▸ ${winsToRecover} wins to recover`}
        </motion.div>
      )}

      {/* Achievement unlocks */}
      {newAchievements && newAchievements.length > 0 && (
        <motion.div
          className="flex flex-col items-center gap-3 w-full max-w-md"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
        >
          <div className="font-mono text-[11px] tracking-[2px] text-gold uppercase font-bold">
            ✦ {newAchievements.length === 1 ? 'Achievement unlocked' : 'Achievements unlocked'}
          </div>
          {newAchievements.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.7 + i * 0.15 }}
              className="w-full border border-gold bg-accent-glow px-4 py-3 flex items-center gap-3"
            >
              <span className="text-[24px]">{a.icon}</span>
              <div>
                <div className="font-display font-bold text-[14px] text-ink">{a.name}</div>
                <div className="font-mono text-[11px] text-ink-tertiary uppercase tracking-[1px]">{a.description}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        className="flex flex-wrap items-center justify-center gap-3 mt-2"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
      >
        {opponentId && (
          incomingRematchCode ? (
            <Link href={`/challenge/${incomingRematchCode}/lobby`}>
              <Btn size="lg" variant="primary" className="animate-neon-pulse">Join rematch</Btn>
            </Link>
          ) : (
            <Btn size="lg" variant="primary" disabled={rematchLoading} onClick={handleRematch}>
              {rematchLoading ? 'Creating…' : '▶ Rematch'}
            </Btn>
          )
        )}

        <Link href="/play"><Btn size="lg" variant="gold">New opponent</Btn></Link>

        {matchId && (
          <Link href={`/play/${matchId}/analysis`}>
            <Btn size="md" variant="ghost">Analysis</Btn>
          </Link>
        )}

        <Btn size="md" variant="ghost" onClick={handleShare}>Share</Btn>

        <Link href="/dashboard">
          <Btn size="md" variant="ghost">Dashboard</Btn>
        </Link>
      </motion.div>
    </div>
  );
}
