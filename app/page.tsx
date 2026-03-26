import Link from 'next/link';
import { ThemeSettings } from '@/components/layout/ThemeSettings';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-page flex flex-col relative">

      {/* Nav */}
      <nav className="border-b border-edge-faint relative z-[1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <span className="font-serif text-base font-bold text-ink tracking-[1px]">
              MATH<span className="font-normal text-ink-tertiary">ARENA</span>
            </span>
            <div className="flex items-center gap-6">
              <Link href="/leaderboard" className="text-[12px] tracking-[1.5px] text-ink-muted hover:text-ink-secondary transition-colors">
                RANKINGS
              </Link>
              <ThemeSettings />
              <Link
                href="/login"
                className="px-4 py-1.5 border border-edge-strong rounded-sm text-[12px] tracking-[1.5px] text-ink-secondary hover:text-ink hover:border-edge-strong transition-colors"
              >
                SIGN IN
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center relative z-[1]">
        <div className="text-[12px] tracking-[4px] text-ink-muted mb-6">
          COMPETITIVE MENTAL MATH
        </div>
        <h1 className="font-serif text-5xl md:text-6xl font-normal text-ink leading-tight mb-5 tracking-tight">
          Where Numbers<br />Become <em className="text-ink-secondary">Sport</em>
        </h1>
        <p className="text-[15px] text-ink-tertiary max-w-[420px] leading-relaxed font-normal mb-10">
          Challenge players worldwide in real-time mental math duels. Climb the Elo rankings. Sharpen your mind.
        </p>

        <div className="flex gap-4">
          <Link
            href="/signup"
            className="px-8 py-3 bg-btn text-btn-text text-xs font-semibold tracking-[1.5px] rounded-sm transition-colors hover:bg-btn-hover"
          >
            START PLAYING
          </Link>
          <Link
            href="/leaderboard"
            className="px-8 py-3 border border-edge-strong text-ink-tertiary text-xs tracking-[1.5px] rounded-sm transition-colors hover:border-edge-strong hover:text-ink-secondary"
          >
            VIEW RANKINGS
          </Link>
        </div>
      </main>

      {/* Features */}
      <div className="relative z-[1] flex border-t border-edge-faint">
        <div className="flex-1 py-10 px-6 text-center border-r border-edge-faint">
          <div className="font-serif text-3xl font-normal italic text-ink-tertiary mb-4">&times;</div>
          <div className="font-serif text-base text-ink mb-2">Real-Time Duels</div>
          <p className="text-xs text-ink-muted leading-relaxed max-w-[240px] mx-auto">
            Head-to-head matches against players at your skill level. First to five wins.
          </p>
        </div>
        <div className="flex-1 py-10 px-6 text-center border-r border-edge-faint">
          <div className="font-serif text-3xl font-normal italic text-ink-tertiary mb-4">&Sigma;</div>
          <div className="font-serif text-base text-ink mb-2">Elo Rankings</div>
          <p className="text-xs text-ink-muted leading-relaxed max-w-[240px] mx-auto">
            Chess-style rating system tracks your progress and finds worthy opponents.
          </p>
        </div>
        <div className="flex-1 py-10 px-6 text-center">
          <div className="font-serif text-3xl font-normal italic text-ink-tertiary mb-4">&part;</div>
          <div className="font-serif text-base text-ink mb-2">Learn &amp; Practice</div>
          <p className="text-xs text-ink-muted leading-relaxed max-w-[240px] mx-auto">
            Master mental math techniques with guided lessons and unlimited practice.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-edge-faint py-8 text-center text-[12px] tracking-[2px] text-ink-faint relative z-[1]">
        MATHARENA &mdash; SHARPEN YOUR MIND
      </footer>
    </div>
  );
}
