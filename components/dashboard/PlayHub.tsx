'use client';

import { useRouter } from 'next/navigation';
import { PlayTile } from './PlayTile';
import { PlayPanel } from './PlayPanel';
import { NextPuzzleCountdown } from '@/components/daily/NextPuzzleCountdown';
import { formatLeaderboardTime } from '@/lib/daily/formatTime';

type PlayHubMode = 'authed' | 'guest';

interface PlayHubProps {
  mode: PlayHubMode;
  sprintPB?: number | null;
  dailyStreak?: number;
  dailyCompleted?: boolean;
  bestDailyRank?: number | null;
  bestDailyTimeMs?: number | null;
  onlineCount?: number | null;
  eloRating?: number;
  pendingInvitesCount?: number;
  onChallengeFriend?: () => void;
}

function SectionStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[10px] tracking-[1.5px] text-ink-faint uppercase">{label}</span>
      <span className="font-mono tabular-nums text-[14px] text-ink-secondary">{value}</span>
    </span>
  );
}

const ICON_SPRINT = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ICON_DAILY = (
  <span className="font-serif text-xl italic leading-none" aria-hidden>
    Σ
  </span>
);

const ICON_FIND = (
  <span className="font-serif text-xl italic leading-none" aria-hidden>
    ×
  </span>
);

const ICON_CHALLENGE = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export function PlayHub({
  mode,
  sprintPB = null,
  dailyStreak = 0,
  dailyCompleted = false,
  bestDailyRank = null,
  bestDailyTimeMs = null,
  onlineCount = null,
  eloRating,
  pendingInvitesCount = 0,
  onChallengeFriend,
}: PlayHubProps) {
  const router = useRouter();
  const isGuest = mode === 'guest';

  const goLogin = (redirect: string) => router.push(`/login?redirect=${encodeURIComponent(redirect)}`);

  // ─── SP stat strip (authed only) ───
  const spStats = !isGuest ? (
    <>
      {sprintPB !== null && <SectionStat label="Sprint PB" value={String(sprintPB)} />}
      {bestDailyRank !== null && (
        <SectionStat
          label="Daily best"
          value={
            bestDailyTimeMs !== null
              ? `#${bestDailyRank} · ${formatLeaderboardTime(bestDailyTimeMs)}`
              : `#${bestDailyRank}`
          }
        />
      )}
    </>
  ) : null;

  // ─── MP stat strip (authed only) ───
  const mpStats = !isGuest && eloRating !== undefined ? <SectionStat label="Elo" value={String(eloRating)} /> : null;

  // ─── Per-tile stats (authed) ───
  const sprintStat = !isGuest
    ? sprintPB !== null
      ? (
        <span>
          <span className="text-[10px] tracking-[1.5px] text-ink-faint uppercase mr-1.5">Best</span>
          <span className="font-mono tabular-nums text-accent text-[18px]">{sprintPB}</span>
        </span>
      ) : (
        <span className="text-ink-muted">Set your first record</span>
      )
    : (
      <span className="text-[11px] tracking-[1.5px] text-ink-faint uppercase">All operations · 120 seconds</span>
    );

  const dailyStat = !isGuest
    ? dailyStreak > 0
      ? (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden>🔥</span>
          <span className="font-mono tabular-nums text-ink-secondary">{dailyStreak}</span>
          <span className="text-[11px] tracking-[1.5px] text-ink-faint uppercase">day streak</span>
        </span>
      ) : (
        <span className="text-ink-muted">Start your streak</span>
      )
    : <span className="text-ink-muted">5 problems · once per day</span>;

  const findStat = !isGuest && onlineCount !== null ? (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 motion-safe:animate-pulse" aria-hidden />
      <span className="font-mono tabular-nums text-ink-secondary">{onlineCount}</span>
      <span className="text-[11px] tracking-[1.5px] text-ink-faint uppercase">online</span>
    </span>
  ) : null;

  const challengeStat = !isGuest
    ? pendingInvitesCount > 0
      ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="font-mono tabular-nums text-accent text-[15px]">{pendingInvitesCount}</span>
          <span className="text-[11px] tracking-[1.5px] text-accent/80 uppercase">
            {pendingInvitesCount === 1 ? 'invite waiting' : 'invites waiting'}
          </span>
        </span>
      ) : (
        <span className="text-ink-muted">Generate a private link</span>
      )
    : null;

  // ─── Daily completed body (authed only) ───
  const dailyBody = !isGuest && dailyCompleted ? (
    <div className="flex flex-col gap-3">
      <span className="inline-flex items-center gap-1.5 text-accent text-[12px] font-semibold">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Completed today
      </span>
      <NextPuzzleCountdown className="text-left" />
    </div>
  ) : undefined;

  // ─── MP locked overlay (guest only) ───
  const mpLockedOverlay = isGuest ? (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <div className="text-[10px] tracking-[2px] text-accent uppercase mb-1">Real opponents · Real rating</div>
        <div className="text-[13px] text-ink-secondary">Free account, 30 seconds.</div>
      </div>
      <button
        type="button"
        onClick={() => goLogin('/')}
        className="shrink-0 px-5 py-2.5 bg-accent text-on-accent text-[11px] tracking-[2px] font-bold rounded-sm hover:bg-accent/90 transition-colors"
      >
        SIGN IN TO PLAY
      </button>
    </div>
  ) : undefined;

  return (
    <section aria-labelledby="play-hub-heading">
      <div>
        <div className="text-[12px] tracking-[4px] text-ink-muted mb-3">PLAY</div>
        <h2 id="play-hub-heading" className="font-serif text-3xl text-ink leading-tight mb-1">
          Pick your fight
        </h2>
        <p className="text-[13px] text-ink-muted">
          {isGuest ? 'Play free as guest. Sign in to save your score.' : 'Quick warmup, daily ritual, or live duel.'}
        </p>
      </div>

      <div className="mt-7 flex flex-col lg:flex-row gap-4">
        {/* SINGLE PLAYER — wider */}
        <div className="lg:flex-[3]">
          <PlayPanel variant="sp" eyebrow="Solo" title="Single Player" stats={spStats}>
            <PlayTile
              variant="sp"
              icon={ICON_SPRINT}
              title="120s Sprint"
              blurb="Beat your best in 2 minutes"
              stat={sprintStat}
              ctaLabel={isGuest ? '▶ PLAY FREE' : 'START SPRINT'}
              onActivate={() => router.push('/practice?sprint=120')}
              ariaLabel={
                isGuest
                  ? 'Play a 120-second sprint as a guest, no signup needed.'
                  : sprintPB !== null
                  ? `Start a 120-second sprint. Personal best: ${sprintPB}.`
                  : 'Start a 120-second sprint. No record yet.'
              }
            />
            <PlayTile
              variant="sp"
              icon={ICON_DAILY}
              title="Daily Puzzle"
              blurb="5 problems, fastest time today"
              stat={dailyStat}
              ctaLabel={isGuest ? undefined : "SOLVE TODAY'S PUZZLE"}
              onActivate={() => (isGuest ? goLogin('/daily') : router.push('/daily'))}
              bodySlot={dailyBody}
              locked={isGuest}
              ariaLabel={
                isGuest
                  ? 'Daily Puzzle is locked. Sign in to play.'
                  : dailyCompleted
                  ? "Today's daily puzzle is complete. View your results."
                  : `Solve today's daily puzzle. Current streak: ${dailyStreak} days.`
              }
            />
          </PlayPanel>
        </div>

        {/* MULTIPLAYER — narrower */}
        <div className="lg:flex-[2]">
          <PlayPanel
            variant="mp"
            eyebrow="Ranked"
            title="Multiplayer"
            stats={mpStats}
            lockedOverlay={mpLockedOverlay}
          >
            <PlayTile
              variant="mp"
              icon={ICON_FIND}
              title="Find a Player"
              blurb="Ranked match, first to 5"
              stat={findStat}
              ctaLabel={isGuest ? undefined : 'PLAY NOW'}
              onActivate={() => (isGuest ? goLogin('/play') : router.push('/play'))}
              locked={isGuest}
              ariaLabel={
                isGuest
                  ? 'Find a Player is locked. Sign in to play.'
                  : onlineCount !== null
                  ? `Start a ranked match. ${onlineCount} players online.`
                  : 'Start a ranked match.'
              }
            />
            <PlayTile
              variant="mp"
              icon={ICON_CHALLENGE}
              title="Challenge a friend"
              blurb="Send a private match link"
              stat={challengeStat}
              ctaLabel={isGuest ? undefined : 'CREATE CHALLENGE'}
              onActivate={() => (isGuest ? goLogin('/') : onChallengeFriend?.())}
              locked={isGuest}
              ariaLabel={
                isGuest
                  ? 'Challenge a friend is locked. Sign in to play.'
                  : pendingInvitesCount > 0
                  ? `Challenge a friend. ${pendingInvitesCount} ${pendingInvitesCount === 1 ? 'invite waiting' : 'invites waiting'}.`
                  : 'Challenge a friend with a private match link.'
              }
            />
          </PlayPanel>
        </div>
      </div>
    </section>
  );
}
