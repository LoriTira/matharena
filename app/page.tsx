import Link from 'next/link';
import { MathTexture } from '@/components/layout/MathTexture';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col relative">
      <MathTexture />

      {/* Nav */}
      <nav className="border-b border-white/[0.04] relative z-[1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <span className="font-serif text-base font-bold text-white/90 tracking-[1px]">
              MATH<span className="font-light text-white/35">ARENA</span>
            </span>
            <div className="flex items-center gap-6">
              <Link href="/leaderboard" className="text-[10px] tracking-[1.5px] text-white/25 hover:text-white/70 transition-colors">
                RANKINGS
              </Link>
              <Link
                href="/login"
                className="px-4 py-1.5 border border-white/[0.15] rounded-sm text-[10px] tracking-[1.5px] text-white/60 hover:text-white/90 hover:border-white/25 transition-colors"
              >
                SIGN IN
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center relative z-[1]">
        <div className="text-[10px] tracking-[4px] text-white/25 mb-6">
          COMPETITIVE MENTAL MATH
        </div>
        <h1 className="font-serif text-5xl md:text-6xl font-light text-white/[0.92] leading-tight mb-5 tracking-tight">
          Where Numbers<br />Become <em className="text-white/60">Sport</em>
        </h1>
        <p className="text-[15px] text-white/35 max-w-[420px] leading-relaxed font-light mb-10">
          Challenge players worldwide in real-time mental math duels. Climb the Elo rankings. Sharpen your mind.
        </p>

        <div className="flex gap-4">
          <Link
            href="/signup"
            className="px-8 py-3 bg-white/90 text-[#050505] text-xs font-semibold tracking-[1.5px] rounded-sm transition-colors hover:bg-white"
          >
            START PLAYING
          </Link>
          <Link
            href="/leaderboard"
            className="px-8 py-3 border border-white/[0.12] text-white/50 text-xs tracking-[1.5px] rounded-sm transition-colors hover:border-white/25 hover:text-white/70"
          >
            VIEW RANKINGS
          </Link>
        </div>
      </main>

      {/* Features */}
      <div className="relative z-[1] flex border-t border-white/[0.04]">
        <div className="flex-1 py-10 px-6 text-center border-r border-white/[0.04]">
          <div className="font-serif text-3xl font-light italic text-white/50 mb-4">&times;</div>
          <div className="font-serif text-base text-white/80 mb-2">Real-Time Duels</div>
          <p className="text-xs text-white/30 leading-relaxed max-w-[240px] mx-auto">
            Head-to-head matches against players at your skill level. First to five wins.
          </p>
        </div>
        <div className="flex-1 py-10 px-6 text-center border-r border-white/[0.04]">
          <div className="font-serif text-3xl font-light italic text-white/50 mb-4">&Sigma;</div>
          <div className="font-serif text-base text-white/80 mb-2">Elo Rankings</div>
          <p className="text-xs text-white/30 leading-relaxed max-w-[240px] mx-auto">
            Chess-style rating system tracks your progress and finds worthy opponents.
          </p>
        </div>
        <div className="flex-1 py-10 px-6 text-center">
          <div className="font-serif text-3xl font-light italic text-white/50 mb-4">&part;</div>
          <div className="font-serif text-base text-white/80 mb-2">Learn &amp; Practice</div>
          <p className="text-xs text-white/30 leading-relaxed max-w-[240px] mx-auto">
            Master mental math techniques with guided lessons and unlimited practice.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8 text-center text-[10px] tracking-[2px] text-white/[0.15] relative z-[1]">
        MATHARENA &mdash; SHARPEN YOUR MIND
      </footer>
    </div>
  );
}
