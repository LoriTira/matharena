import Link from 'next/link';
import { Shell } from '@/components/arcade/Shell';
import { ThemeSettings } from '@/components/layout/ThemeSettings';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TIERS, getRank } from '@/lib/ranks';
import { RankPip } from '@/components/arcade/RankPip';
import { type Tier } from '@/components/arcade/tokens';

// Anonymous landing. All visible data is pulled from real tables; any block
// whose query returns nothing is omitted rather than rendered with placeholder.
export const revalidate = 300;

const MODES = [
  {
    tag: 'RANKED',
    name: 'Duel',
    line: 'Head-to-head. Elo on the line.',
    color: 'magenta' as const,
    body: 'Solve problems faster than your opponent. First to the target score wins. Wrong answers cost time.',
    href: '/signup',
  },
  {
    tag: 'FREE',
    name: 'Practice',
    line: 'Solo. Dial in the difficulty.',
    color: 'cyan' as const,
    body: 'Pick operators, operand ranges, and duration. No rating impact, unlimited runs, focus on what you want.',
    href: '/signup',
  },
  {
    tag: 'DAILY',
    name: 'Puzzle',
    line: 'One puzzle. Everyone tries.',
    color: 'gold' as const,
    body: 'Five problems every 24h. Global leaderboard. Build a streak by showing up.',
    href: '/signup',
  },
  {
    tag: 'LEARN',
    name: 'Lessons',
    line: 'Mental shortcuts, earned.',
    color: 'lime' as const,
    body: 'Step-by-step lessons on the tricks that win duels — the 11-trick, squaring numbers ending in 5, and more.',
    href: '/signup',
  },
];

const MODE_COLOR_CLASS = {
  magenta: 'text-magenta border-magenta',
  cyan: 'text-cyan border-cyan',
  gold: 'text-gold border-gold',
  lime: 'text-lime border-lime',
} as const;

function tierToArcade(name: string): Tier {
  switch (name) {
    case 'Bronze':      return 'Bronze';
    case 'Silver':      return 'Silver';
    case 'Gold':        return 'Gold';
    case 'Platinum':    return 'Platinum';
    case 'Diamond':     return 'Diamond';
    case 'Grandmaster': return 'Grand';
    default:            return 'Wood';
  }
}

interface LandingData {
  totalPlayers: number | null;
  countriesRepresented: number | null;
  totalDuels: number | null;
  activeMatches: number | null;
  topPlayers: {
    id: string;
    username: string;
    display_name: string | null;
    elo_rating: number;
    country: string | null;
    affiliation: string | null;
    games_played: number;
    games_won: number;
  }[];
}

// Fetch landing data directly on the server — avoid a double HTTP hop during
// SSR. Admin client is only used for the aggregate counts that anon can't read.
async function loadLandingData(): Promise<LandingData> {
  const supabase = await createClient();

  let totalPlayers: number | null = null;
  let countriesRepresented: number | null = null;
  let totalDuels: number | null = null;
  let activeMatches: number | null = null;
  let topPlayers: LandingData['topPlayers'] = [];

  try {
    const admin = createAdminClient();
    const [playersRes, countriesRes, duelsRes, activeRes] = await Promise.all([
      admin.from('profiles').select('id', { count: 'exact', head: true }),
      admin.from('profiles').select('country').not('country', 'is', null).neq('country', ''),
      admin.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      admin.from('matches').select('id', { count: 'exact', head: true }).in('status', ['waiting', 'active']),
    ]);

    totalPlayers = playersRes.count ?? null;
    totalDuels = duelsRes.count ?? null;
    activeMatches = activeRes.count ?? null;

    const countries = new Set<string>();
    for (const row of (countriesRes.data ?? []) as { country: string | null }[]) {
      if (row.country) countries.add(row.country);
    }
    countriesRepresented = countries.size || null;
  } catch {
    // Admin client misconfigured — aggregate block is omitted entirely below.
  }

  const { data: topData } = await supabase
    .from('profiles')
    .select('id, username, display_name, elo_rating, country, affiliation, games_played, games_won')
    .order('elo_rating', { ascending: false })
    .limit(5);
  topPlayers = (topData ?? []) as LandingData['topPlayers'];

  return { totalPlayers, countriesRepresented, totalDuels, activeMatches, topPlayers };
}

function formatInt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return n.toString();
}

export default async function HomePage() {
  const { totalPlayers, countriesRepresented, totalDuels, activeMatches, topPlayers } =
    await loadLandingData();

  const hasAggregateStats =
    totalPlayers !== null || totalDuels !== null || countriesRepresented !== null;

  // Stats cards only render when all their values are real.
  const stats: { label: string; value: string }[] = [];
  if (totalDuels !== null && totalDuels > 0) {
    stats.push({ label: 'Duels played', value: formatInt(totalDuels) });
  }
  if (totalPlayers !== null && totalPlayers > 0) {
    stats.push({ label: 'Players', value: formatInt(totalPlayers) });
  }
  if (countriesRepresented !== null && countriesRepresented > 0) {
    stats.push({ label: 'Countries', value: String(countriesRepresented) });
  }

  return (
    <Shell>
      {/* ═══════ NAV ═══════ */}
      <nav className="relative z-40 border-b border-edge backdrop-blur-[8px]">
        <div className="max-w-7xl mx-auto px-5 md:px-14 flex items-center justify-between py-[18px]">
          <div className="flex items-center gap-[10px]">
            <span
              className="grid place-items-center font-mono font-bold text-[14px] text-[#0a0612]"
              style={{
                width: 28,
                height: 28,
                background: 'var(--neon-magenta)',
                boxShadow: '0 0 18px var(--neon-magenta), inset 0 0 0 2px rgba(0,0,0,0.15)',
              }}
            >
              ∑
            </span>
            <span className="font-display font-bold text-[17px] tracking-[-0.3px] text-ink">
              MATHS<span className="text-cyan">ARENA</span>
            </span>
          </div>

          <div className="hidden md:flex gap-[28px] font-mono text-[12px] uppercase tracking-[1px] text-ink-tertiary">
            <Link href="/leaderboard" className="hover:text-ink transition-colors">
              Leaderboard
            </Link>
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
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section className="relative px-5 md:px-14 pt-[56px] md:pt-[80px] pb-[56px] md:pb-[80px]">
        {/* Live strap — only renders if there's a real active match count */}
        {activeMatches !== null && activeMatches > 0 && (
          <div className="flex items-center gap-[10px] font-mono text-[11px] text-ink-tertiary uppercase tracking-[1.6px] mb-[20px]">
            <span
              className="inline-block rounded-full"
              style={{
                width: 8,
                height: 8,
                background: 'var(--neon-lime)',
                boxShadow: '0 0 8px var(--neon-lime)',
              }}
            />
            <span>
              {activeMatches} active match{activeMatches === 1 ? '' : 'es'}
            </span>
          </div>
        )}

        <h1 className="font-display font-extrabold uppercase text-[48px] md:text-[132px] leading-[0.88] tracking-[-0.04em] m-0">
          <span className="block">Do the math.</span>
          <span className="block neon-outline">Win the duel.</span>
          <span className="block italic text-gold">Become a legend.</span>
        </h1>

        <div className="flex flex-wrap gap-[40px] md:gap-[80px] mt-[32px] md:mt-[48px] items-end">
          <div className="max-w-full md:max-w-[440px]">
            <div className="text-[15px] md:text-[17px] leading-[1.5] text-ink-tertiary mb-[24px]">
              Real-time mental math duels with a chess-style Elo. Race the clock, race your opponent. Climb
              from <span className="text-ink">Bronze</span> to{' '}
              <span className="text-gold">Grandmaster</span> by thinking faster.
            </div>
            <div className="flex gap-[12px] flex-wrap items-center">
              <Link
                href="/signup"
                className="font-mono text-[13px] font-bold uppercase tracking-[1.4px] px-[28px] py-[16px] bg-cyan text-[#0a0612] border border-ink"
                style={{ boxShadow: '5px 5px 0 var(--neon-magenta)' }}
              >
                ▶ Sign up to play
              </Link>
              <Link
                href="/leaderboard"
                className="font-mono text-[13px] font-semibold uppercase tracking-[1.4px] px-[20px] py-[16px] text-ink border border-edge-strong hover:border-ink transition-colors"
              >
                View leaderboard
              </Link>
            </div>
            <div className="mt-[20px] font-mono text-[11px] text-ink-faint uppercase tracking-[1.2px]">
              Free to play · Google sign-in
            </div>
          </div>

          {stats.length > 0 && (
            <div className="hidden md:grid grid-cols-[repeat(var(--stat-cols),minmax(0,1fr))] gap-[16px] max-w-[480px] flex-1"
              style={{ ['--stat-cols' as string]: String(stats.length) }}
            >
              {stats.map((s) => (
                <div key={s.label} className="px-[14px] py-[16px] border border-edge bg-panel">
                  <div className="font-display font-bold text-[32px] text-cyan tracking-[-1px]">
                    {s.value}
                  </div>
                  <div className="font-mono text-[10px] text-ink-tertiary uppercase tracking-[1.2px] mt-[2px]">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════ RANK TIERS (from lib/ranks.ts — the real Elo system) ═══════ */}
      <section className="px-5 md:px-14 py-[56px] md:py-[96px] border-t border-edge">
        <div className="flex items-baseline gap-[14px] mb-[28px] flex-wrap">
          <div className="font-mono text-[11px] text-cyan uppercase tracking-[1.6px]">/01 — Ranks</div>
          <div className="flex-1 h-px bg-edge min-w-[40px]" />
        </div>
        <h2 className="font-display font-bold text-[32px] md:text-[48px] leading-[1.05] tracking-[-1.2px] m-0 mb-[28px] md:mb-[48px] max-w-[800px]">
          Climb the ladder. {TIERS.length} tiers.
        </h2>
        <div className={`grid grid-cols-2 md:grid-cols-${TIERS.length} gap-[10px] md:gap-[12px]`}>
          {TIERS.map((t, i) => {
            const arcade = tierToArcade(t.name);
            return (
              <div key={t.name} className="border border-edge bg-panel px-[14px] py-[20px] text-center">
                <div
                  className="w-[52px] h-[52px] mx-auto mb-[12px] rounded-full grid place-items-center font-display font-extrabold text-[18px] text-[#0a0612]"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${t.color}, ${t.color}22)`,
                    border: `2px solid ${t.color}`,
                    boxShadow: `0 0 16px ${t.color}66`,
                  }}
                >
                  {i + 1}
                </div>
                <div className="font-display font-bold text-[14px]">{t.name}</div>
                <div className="font-mono text-[10px] text-ink-tertiary mt-[4px] tracking-[0.6px]">
                  {t.max === Infinity ? `${t.min}+` : `${t.min}—${t.max}`}
                </div>
                <div className="sr-only"><RankPip tier={arcade} size={1} /></div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════ MODES ═══════ */}
      <section className="px-5 md:px-14 py-[56px] md:py-[96px] border-t border-edge">
        <div className="flex items-baseline gap-[14px] mb-[28px] flex-wrap">
          <div className="font-mono text-[11px] text-gold uppercase tracking-[1.6px]">/02 — Modes</div>
          <div className="flex-1 h-px bg-edge min-w-[40px]" />
        </div>
        <h2 className="font-display font-bold text-[32px] md:text-[48px] tracking-[-1.2px] m-0 mb-[28px] md:mb-[48px]">
          Four ways to play.
        </h2>
        <div className="grid md:grid-cols-2 gap-[16px]">
          {MODES.map((m) => (
            <Link
              key={m.name}
              href={m.href}
              className="relative overflow-hidden border border-edge-strong bg-panel px-[20px] py-[22px] md:px-[28px] md:py-[28px] hover:border-ink transition-colors block"
            >
              <div
                className="absolute pointer-events-none"
                style={{
                  top: 0,
                  right: 0,
                  width: 120,
                  height: 120,
                  background: `radial-gradient(circle at 80% 20%, var(--neon-${m.color})33, transparent 70%)`,
                }}
              />
              <div
                className={`font-mono text-[10px] uppercase tracking-[2px] inline-block px-[8px] py-[3px] border ${MODE_COLOR_CLASS[m.color]}`}
              >
                {m.tag}
              </div>
              <div className="font-display font-bold text-[32px] md:text-[40px] tracking-[-1px] mt-[18px] mb-[4px]">
                {m.name}
              </div>
              <div className="font-display text-[16px] text-ink-tertiary mb-[14px]">{m.line}</div>
              <div className="text-[13px] text-ink-tertiary leading-[1.55]">{m.body}</div>
              <div
                className={`mt-[18px] font-mono text-[11px] uppercase tracking-[1.6px] ${MODE_COLOR_CLASS[m.color]} border-0`}
              >
                Open {m.name.toLowerCase()} →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══════ LEADERBOARD (real top 5 from profiles) ═══════ */}
      {topPlayers.length > 0 && (
        <section className="px-5 md:px-14 py-[56px] md:py-[96px] border-t border-edge">
          <div className="flex items-baseline gap-[14px] mb-[28px] flex-wrap">
            <div className="font-mono text-[11px] text-lime uppercase tracking-[1.6px]">
              /03 — Leaderboard
            </div>
            <div className="flex-1 h-px bg-edge min-w-[40px]" />
          </div>
          <div className="flex items-end justify-between mb-[24px] gap-[20px] flex-wrap">
            <h2 className="font-display font-bold text-[32px] md:text-[48px] tracking-[-1.2px] m-0 max-w-[600px]">
              Top {topPlayers.length} <span className="text-magenta">right now.</span>
            </h2>
            <Link
              href="/leaderboard"
              className="font-mono text-[11px] uppercase tracking-[1.4px] px-[14px] py-[8px] border border-edge-strong text-ink-tertiary hover:text-ink hover:border-ink transition-colors"
            >
              Full rankings →
            </Link>
          </div>
          <div className="border border-edge-strong bg-panel">
            <div className="grid grid-cols-[48px_1fr_80px_80px] md:grid-cols-[60px_1fr_1fr_80px_80px] px-[18px] py-[12px] font-mono text-[10px] text-ink-tertiary uppercase tracking-[1.4px] border-b border-edge">
              <span>Rk</span>
              <span>Player</span>
              <span className="hidden md:block">Affiliation</span>
              <span className="text-right">Elo</span>
              <span className="text-right">Win%</span>
            </div>
            {topPlayers.map((p, i) => {
              const rk = i + 1;
              const winRate =
                p.games_played > 0 ? Math.round((p.games_won / p.games_played) * 100) : 0;
              const rank = getRank(p.elo_rating);
              const arcadeTier = tierToArcade(rank.tier);
              return (
                <Link
                  key={p.id}
                  href={`/profile/${p.id}`}
                  className="grid grid-cols-[48px_1fr_80px_80px] md:grid-cols-[60px_1fr_1fr_80px_80px] px-[18px] py-[14px] items-center font-mono text-[13px] border-b border-edge last:border-b-0 hover:bg-tint transition-colors"
                >
                  <span
                    className="font-display font-extrabold text-[18px]"
                    style={{ color: rk === 1 ? 'var(--neon-gold)' : 'var(--text-primary)' }}
                  >
                    {rk}
                  </span>
                  <span className="flex items-center gap-2 text-ink font-semibold truncate">
                    <RankPip tier={arcadeTier} size={18} />
                    <span className="truncate">{p.display_name || p.username}</span>
                  </span>
                  <span className="hidden md:block text-ink-tertiary text-[12px] truncate">
                    {p.affiliation ?? '—'}
                  </span>
                  <span className="text-right text-cyan font-bold">{p.elo_rating}</span>
                  <span className="text-right text-ink-tertiary">
                    {p.games_played > 0 ? `${winRate}%` : '—'}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════ CTA ═══════ */}
      <section
        className="px-5 md:px-14 py-[64px] md:py-[120px] border-t border-edge text-center relative"
        style={{ background: 'linear-gradient(180deg, transparent, var(--bg-raised))' }}
      >
        <div className="font-mono text-[11px] text-gold uppercase tracking-[2px] mb-[18px]">
          ✦ Ready, player one
        </div>
        <h2 className="font-display font-extrabold uppercase text-[44px] md:text-[96px] leading-[0.95] tracking-[-3px] m-0">
          Your first duel<br />
          is <span className="text-magenta">waiting.</span>
        </h2>
        <div className="flex gap-[12px] justify-center mt-[36px] flex-wrap">
          <Link
            href="/signup"
            className="font-mono text-[14px] font-bold uppercase tracking-[1.4px] px-[36px] py-[18px] bg-gold text-[#0a0612] border border-ink inline-block"
            style={{ boxShadow: '6px 6px 0 var(--neon-magenta)' }}
          >
            Create account →
          </Link>
        </div>
        <div className="mt-[20px] font-mono text-[11px] text-ink-tertiary uppercase tracking-[1.2px]">
          Free · Google sign-in available
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="px-5 md:px-14 py-[32px] md:py-[40px] border-t border-edge-strong font-mono text-[11px] text-ink-tertiary uppercase tracking-[1.2px] flex justify-between flex-wrap gap-[12px]">
        <span>© {new Date().getFullYear()} MathsArena</span>
        <span>
          <Link href="/leaderboard" className="hover:text-ink transition-colors">
            Leaderboard
          </Link>
        </span>
      </footer>
    </Shell>
  );
}
