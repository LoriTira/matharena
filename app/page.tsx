import Link from 'next/link';
import { Shell } from '@/components/arcade/Shell';
import { RaceLane } from '@/components/arcade/RaceLane';
import { Ticker } from '@/components/arcade/Ticker';
import { RankPip } from '@/components/arcade/RankPip';
import { TIER_ORDER, TIER_COLORS, TIER_RANGES } from '@/components/arcade/tokens';
import { ThemeSettings } from '@/components/layout/ThemeSettings';

const TICKER_ITEMS = [
  '▸ mira_k takes down @speedwolf · +27 ELO',
  '▸ NEW HIGH SCORE · 48× combo by Rafa',
  '▸ weekly cup opens in 2d 14h',
  '▸ Paulo hits Diamond II',
  '▸ 14,892 duels in the last hour',
  '▸ fastest answer today · 0.31s · ×',
  '▸ Anya flawless run · 30/30',
];

const MODES = [
  { tag: 'RANKED', name: 'Duel',     line: 'Head-to-head. Elo on the line.',     color: 'magenta' as const,
    body: 'Best of 10 problems, 30 seconds per. Win condition: first to 6. Ties broken by average response time.' },
  { tag: 'FREE',   name: 'Practice', line: 'Solo. Dial in the difficulty.',      color: 'cyan' as const,
    body: 'Choose operator, operand range, and time pressure. No rating impact, unlimited runs, pause whenever.' },
  { tag: 'DAILY',  name: 'Puzzle',   line: 'One problem. Everyone tries.',       color: 'gold' as const,
    body: 'New every 24h. Global leaderboard. Miss three days and your streak resets.' },
  { tag: 'LEARN',  name: 'Lessons',  line: 'Mental shortcuts, earned.',          color: 'lime' as const,
    body: 'Complement subtraction, the 11-trick, digit-sum casting. Unlock tricks, unlock speed.' },
];

const MODE_COLOR_CLASS = {
  magenta: 'text-magenta border-magenta',
  cyan:    'text-cyan border-cyan',
  gold:    'text-gold border-gold',
  lime:    'text-lime border-lime',
} as const;

const LEADERS = [
  { rk: 1, n: 'kireiji',  aff: 'ETH Zurich',  elo: 2487, w: 94, gold: true  },
  { rk: 2, n: 'paulo_v',  aff: 'Jane Street', elo: 2441, w: 91 },
  { rk: 3, n: 'mira_k',   aff: 'MIT',         elo: 2403, w: 89 },
  { rk: 4, n: '∂x_ani',   aff: 'Two Sigma',   elo: 2388, w: 87 },
  { rk: 5, n: 'zephyr_q', aff: '—',           elo: 2361, w: 85 },
];

export default function HomePage() {
  return (
    <Shell>
      {/* ═══════ NAV ═══════ */}
      <nav className="relative z-40 border-b border-edge backdrop-blur-[8px]">
        <div className="max-w-7xl mx-auto px-5 md:px-14 flex items-center justify-between py-[18px]">
          <div className="flex items-center gap-[10px]">
            <span
              className="grid place-items-center font-mono font-bold text-[14px] text-[#0a0612]"
              style={{
                width: 28, height: 28,
                background: 'var(--neon-magenta)',
                boxShadow: '0 0 18px var(--neon-magenta), inset 0 0 0 2px rgba(0,0,0,0.15)',
              }}
            >∑</span>
            <span className="font-display font-bold text-[17px] tracking-[-0.3px] text-ink">
              MATHS<span className="text-cyan">ARENA</span>
            </span>
          </div>

          <div className="hidden md:flex gap-[28px] font-mono text-[12px] uppercase tracking-[1px] text-ink-tertiary">
            <Link href="/play" className="hover:text-ink transition-colors">Play</Link>
            <Link href="/practice" className="hover:text-ink transition-colors">Practice</Link>
            <Link href="/lessons" className="hover:text-ink transition-colors">Lessons</Link>
            <Link href="/leaderboard" className="hover:text-ink transition-colors">Ranks</Link>
            <Link href="/leaderboard" className="hover:text-ink transition-colors">Leaderboard</Link>
          </div>

          <div className="flex gap-[8px] items-center">
            <ThemeSettings />
            <Link
              href="/login"
              className="hidden md:inline-block font-mono text-[11px] uppercase tracking-[1px] text-ink-tertiary hover:text-ink px-[10px] py-[6px]"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="font-mono text-[11px] font-semibold uppercase tracking-[1.2px] px-[14px] py-[8px] bg-gold text-[#0a0612] border border-ink"
              style={{ boxShadow: '3px 3px 0 var(--neon-magenta)' }}
            >
              Insert Coin
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section className="relative px-5 md:px-14 pt-[56px] md:pt-[80px] pb-[56px] md:pb-[80px]">
        <div className="flex items-center gap-[10px] font-mono text-[11px] text-ink-tertiary uppercase tracking-[1.6px] mb-[20px]">
          <span
            className="inline-block rounded-full"
            style={{
              width: 8, height: 8,
              background: 'var(--neon-lime)',
              boxShadow: '0 0 8px var(--neon-lime)',
            }}
          />
          <span>1,247 players online</span>
          <span className="text-ink-faint">·</span>
          <span>Season 04 · Week 03</span>
        </div>

        <h1 className="font-display font-extrabold uppercase text-[56px] md:text-[132px] leading-[0.88] tracking-[-0.04em] m-0">
          <span className="block">Do the math.</span>
          <span className="block neon-outline">Win the duel.</span>
          <span className="block italic text-gold">Become a legend.</span>
        </h1>

        <div className="flex flex-wrap gap-[40px] md:gap-[80px] mt-[32px] md:mt-[48px] items-end">
          <div className="max-w-full md:max-w-[440px]">
            <div className="text-[15px] md:text-[17px] leading-[1.5] text-ink-tertiary mb-[24px]">
              Real-time mental math duels with a chess-style Elo. Race the clock, race your opponent. Climb from{' '}
              <span className="text-ink">Wood IV</span> to <span className="text-gold">Grandmaster</span> by thinking faster.
            </div>
            <div className="flex gap-[12px] flex-wrap items-center">
              <Link
                href="/signup"
                className="font-mono text-[13px] font-bold uppercase tracking-[1.4px] px-[28px] py-[16px] bg-cyan text-[#0a0612] border border-ink"
                style={{ boxShadow: '5px 5px 0 var(--neon-magenta)' }}
              >
                ▶ Start a duel
              </Link>
              <Link
                href="/practice"
                className="font-mono text-[13px] font-semibold uppercase tracking-[1.4px] px-[20px] py-[16px] text-ink border border-edge-strong hover:border-ink transition-colors"
              >
                Practice solo
              </Link>
            </div>
            <div className="mt-[20px] font-mono text-[11px] text-ink-faint uppercase tracking-[1.2px]">
              Free to play · No ads · 30-second matches
            </div>
          </div>

          <div className="hidden md:grid grid-cols-3 gap-[16px] max-w-[480px] flex-1">
            {[
              { k: '2.1M', v: 'Duels played' },
              { k: '48ms', v: 'Avg response' },
              { k: '187',  v: 'Countries' },
            ].map((s) => (
              <div key={s.v} className="px-[14px] py-[16px] border border-edge bg-panel">
                <div className="font-display font-bold text-[32px] text-cyan tracking-[-1px]">{s.k}</div>
                <div className="font-mono text-[10px] text-ink-tertiary uppercase tracking-[1.2px] mt-[2px]">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ TICKER ═══════ */}
      <Ticker items={TICKER_ITEMS} />

      {/* ═══════ RACE DEMO ═══════ */}
      <section className="px-5 md:px-14 py-[56px] md:py-[96px]">
        <div className="flex items-baseline gap-[14px] mb-[28px] flex-wrap">
          <div className="font-mono text-[11px] text-magenta uppercase tracking-[1.6px]">/01 — The duel</div>
          <div className="flex-1 h-px bg-edge min-w-[40px]" />
        </div>
        <h2 className="font-display font-bold text-[36px] md:text-[56px] leading-[1.02] tracking-[-1.5px] m-0 mb-[32px] md:mb-[56px] max-w-[900px]">
          Two brains. <span className="text-cyan">One track.</span> Whoever answers faster moves first.
        </h2>

        <div className="border border-edge-strong bg-panel px-[18px] py-[24px] md:px-[44px] md:py-[40px] relative">
          <div className="flex justify-between items-center mb-[28px] font-mono text-[11px] text-ink-tertiary uppercase tracking-[1.4px]">
            <span>● Ranked match · BO10</span>
            <span>Round 6 / 10</span>
          </div>

          <div className="text-center py-[20px] md:py-[12px] md:pb-[40px]">
            <div className="font-mono text-[11px] text-ink-faint uppercase tracking-[2px] mb-[10px]">Current problem</div>
            <div className="font-display font-extrabold text-[64px] md:text-[120px] leading-none tracking-[-4px]">
              47 <span className="text-magenta">×</span> 23 <span className="text-ink-faint ml-[16px]">= ?</span>
            </div>
            <div className="font-mono text-[11px] text-gold uppercase tracking-[1.6px] mt-[14px]">
              ▸ tip: (50 × 23) − (3 × 23)
            </div>
          </div>

          <RaceLane you color="cyan" name="YOU" elo={1487} tier="Gold" progress={0.68} streak={5} avatar="Y" />
          <div className="h-[14px]" />
          <RaceLane color="magenta" name="zephyr_q" elo={1503} tier="Gold" progress={0.54} streak={3} avatar="Z" />

          <div className="mt-[32px] flex items-center gap-[12px] px-[18px] py-[14px] border border-edge-strong bg-page font-mono text-[14px] text-ink">
            <span className="text-ink-faint">❯</span>
            <span className="text-[22px] md:text-[28px] tracking-[2px] text-gold">108_</span>
            <span className="flex-1" />
            <span className="text-[11px] text-ink-tertiary uppercase tracking-[1.4px]">Enter ↵</span>
          </div>
        </div>

        <div className="hidden md:grid grid-cols-3 gap-[20px] mt-[40px]">
          {[
            { n: '01', t: 'Read the problem', d: 'You see it the same instant your opponent does.' },
            { n: '02', t: 'Calc it fast',     d: 'Mental tricks beat brute force. We teach them.' },
            { n: '03', t: 'Push the lane',    d: 'Right answer → your racer moves. Wrong → penalty.' },
          ].map((s) => (
            <div key={s.n}>
              <div className="font-mono text-[11px] text-cyan tracking-[1.6px]">{s.n}</div>
              <div className="font-display font-semibold text-[18px] mt-[8px] mb-[6px]">{s.t}</div>
              <div className="text-[13px] text-ink-tertiary leading-[1.5]">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ RANK TIERS ═══════ */}
      <section className="px-5 md:px-14 py-[56px] md:py-[96px] border-t border-edge">
        <div className="flex items-baseline gap-[14px] mb-[28px] flex-wrap">
          <div className="font-mono text-[11px] text-cyan uppercase tracking-[1.6px]">/02 — Ranks</div>
          <div className="flex-1 h-px bg-edge min-w-[40px]" />
        </div>
        <h2 className="font-display font-bold text-[32px] md:text-[48px] leading-[1.05] tracking-[-1.2px] m-0 mb-[28px] md:mb-[48px] max-w-[800px]">
          Climb the ladder. Eight tiers.<br />
          <span className="text-ink-tertiary">Only 0.2% make Grandmaster.</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-8 gap-[10px] md:gap-[12px]">
          {TIER_ORDER.map((t, i) => {
            const c = TIER_COLORS[t];
            const [lo, hi] = TIER_RANGES[t];
            return (
              <div key={t} className="border border-edge bg-panel px-[14px] py-[20px] text-center">
                <div
                  className="w-[52px] h-[52px] mx-auto mb-[12px] rounded-full grid place-items-center font-display font-extrabold text-[18px] text-[#0a0612]"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${c}, ${c}22)`,
                    border: `2px solid ${c}`,
                    boxShadow: `0 0 16px ${c}66`,
                  }}
                >
                  {i + 1}
                </div>
                <div className="font-display font-bold text-[14px]">{t}</div>
                <div className="font-mono text-[10px] text-ink-tertiary mt-[4px] tracking-[0.6px]">
                  {hi >= 9999 ? `${lo}+` : `${lo}—${hi}`}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════ MODES ═══════ */}
      <section className="px-5 md:px-14 py-[56px] md:py-[96px] border-t border-edge">
        <div className="flex items-baseline gap-[14px] mb-[28px] flex-wrap">
          <div className="font-mono text-[11px] text-gold uppercase tracking-[1.6px]">/03 — Modes</div>
          <div className="flex-1 h-px bg-edge min-w-[40px]" />
        </div>
        <h2 className="font-display font-bold text-[32px] md:text-[48px] tracking-[-1.2px] m-0 mb-[28px] md:mb-[48px]">
          Four ways to play.
        </h2>
        <div className="grid md:grid-cols-2 gap-[16px]">
          {MODES.map((m) => (
            <div
              key={m.name}
              className="relative overflow-hidden border border-edge-strong bg-panel px-[20px] py-[22px] md:px-[28px] md:py-[28px]"
            >
              <div
                className="absolute pointer-events-none"
                style={{
                  top: 0, right: 0, width: 120, height: 120,
                  background: `radial-gradient(circle at 80% 20%, var(--neon-${m.color})33, transparent 70%)`,
                }}
              />
              <div className={`font-mono text-[10px] uppercase tracking-[2px] inline-block px-[8px] py-[3px] border ${MODE_COLOR_CLASS[m.color]}`}>
                {m.tag}
              </div>
              <div className="font-display font-bold text-[32px] md:text-[40px] tracking-[-1px] mt-[18px] mb-[4px]">
                {m.name}
              </div>
              <div className="font-display text-[16px] text-ink-tertiary mb-[14px]">{m.line}</div>
              <div className="text-[13px] text-ink-tertiary leading-[1.55]">{m.body}</div>
              <div className={`mt-[18px] font-mono text-[11px] uppercase tracking-[1.6px] ${MODE_COLOR_CLASS[m.color]} border-0`}>
                Enter {m.name.toLowerCase()} →
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ LEADERBOARD TEASE ═══════ */}
      <section className="px-5 md:px-14 py-[56px] md:py-[96px] border-t border-edge">
        <div className="flex items-baseline gap-[14px] mb-[28px] flex-wrap">
          <div className="font-mono text-[11px] text-lime uppercase tracking-[1.6px]">/04 — Leaderboard</div>
          <div className="flex-1 h-px bg-edge min-w-[40px]" />
        </div>
        <div className="flex items-end justify-between mb-[24px] gap-[20px] flex-wrap">
          <h2 className="font-display font-bold text-[32px] md:text-[48px] tracking-[-1.2px] m-0 max-w-[600px]">
            The top five <span className="text-magenta">this week.</span>
          </h2>
          <div className="hidden md:flex gap-[6px]">
            {['Global', 'School', 'Company', 'Country'].map((t, i) => (
              <div
                key={t}
                className={`font-mono text-[11px] uppercase tracking-[1.4px] px-[14px] py-[8px] border ${
                  i === 0 ? 'border-ink bg-ink text-page' : 'border-edge text-ink-tertiary'
                }`}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
        <div className="border border-edge-strong bg-panel">
          <div className="grid grid-cols-[60px_1fr_80px_80px] md:grid-cols-[60px_1fr_1fr_80px_80px] px-[18px] py-[12px] font-mono text-[10px] text-ink-tertiary uppercase tracking-[1.4px] border-b border-edge">
            <span>Rk</span>
            <span>Player</span>
            <span className="hidden md:block">Affiliation</span>
            <span className="text-right">Elo</span>
            <span className="text-right">Win%</span>
          </div>
          {LEADERS.map((r) => (
            <div
              key={r.rk}
              className="grid grid-cols-[60px_1fr_80px_80px] md:grid-cols-[60px_1fr_1fr_80px_80px] px-[18px] py-[14px] items-center font-mono text-[13px] border-b border-edge last:border-b-0"
            >
              <span
                className="font-display font-extrabold text-[18px]"
                style={{ color: r.gold ? 'var(--neon-gold)' : 'var(--text-primary)' }}
              >
                {r.rk}
              </span>
              <span className="font-semibold text-ink">{r.n}</span>
              <span className="hidden md:block text-ink-tertiary text-[12px]">{r.aff}</span>
              <span className="text-right text-cyan font-bold">{r.elo}</span>
              <span className="text-right text-ink-tertiary">{r.w}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section
        className="px-5 md:px-14 py-[64px] md:py-[120px] border-t border-edge text-center relative"
        style={{ background: 'linear-gradient(180deg, transparent, var(--bg-raised))' }}
      >
        <div className="font-mono text-[11px] text-gold uppercase tracking-[2px] mb-[18px]">
          ✦ Ready, player one
        </div>
        <h2 className="font-display font-extrabold uppercase text-[44px] md:text-[96px] leading-[0.95] tracking-[-3px] m-0">
          Your first duel<br />is <span className="text-magenta">waiting.</span>
        </h2>
        <div className="flex gap-[12px] justify-center mt-[36px] flex-wrap">
          <Link
            href="/signup"
            className="font-mono text-[14px] font-bold uppercase tracking-[1.4px] px-[36px] py-[18px] bg-gold text-[#0a0612] border border-ink inline-block"
            style={{ boxShadow: '6px 6px 0 var(--neon-magenta)' }}
          >
            Play now →
          </Link>
        </div>
        <div className="mt-[20px] font-mono text-[11px] text-ink-tertiary uppercase tracking-[1.2px]">
          Sign up with Google · ~30 seconds
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="px-5 md:px-14 py-[32px] md:py-[40px] border-t border-edge-strong font-mono text-[11px] text-ink-tertiary uppercase tracking-[1.2px] flex justify-between flex-wrap gap-[12px]">
        <span>© 2026 MathsArena · Think fast, win.</span>
        <span>Terms · Privacy · Discord</span>
      </footer>
    </Shell>
  );
}
