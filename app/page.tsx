import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Navbar for landing */}
      <nav className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <span className="text-2xl font-bold text-white">
              Math<span className="text-blue-500">Arena</span>
            </span>
            <div className="flex items-center gap-4">
              <Link href="/leaderboard" className="text-gray-300 hover:text-white transition-colors">
                Rankings
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-white max-w-4xl leading-tight">
          Compete in
          <span className="text-blue-500"> Mental Math</span>
        </h1>
        <p className="text-xl text-gray-400 mt-6 max-w-2xl">
          Challenge players worldwide in real-time math duels. Climb the Elo rankings.
          Master mental calculation with lessons and practice.
        </p>

        <div className="flex gap-4 mt-10">
          <Link
            href="/signup"
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold rounded-xl transition-colors shadow-lg shadow-blue-600/20"
          >
            Start Playing
          </Link>
          <Link
            href="/leaderboard"
            className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white text-lg font-medium rounded-xl transition-colors border border-gray-700"
          >
            View Rankings
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-5xl w-full">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-left">
            <div className="text-3xl mb-4">⚔️</div>
            <h3 className="text-xl font-bold text-white">Real-Time Duels</h3>
            <p className="text-gray-400 mt-2">
              Race head-to-head against opponents. First to solve 5 problems wins. Speed and accuracy matter.
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-left">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-white">Elo Rankings</h3>
            <p className="text-gray-400 mt-2">
              Chess.com-style rating system. Climb the global leaderboard and represent your school or company.
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-left">
            <div className="text-3xl mb-4">🧠</div>
            <h3 className="text-xl font-bold text-white">Learn & Practice</h3>
            <p className="text-gray-400 mt-2">
              Master mental math tricks through lessons. Practice at your own pace without affecting your rating.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-6 text-center text-gray-500 text-sm">
        MathArena — Competitive Mental Math
      </footer>
    </div>
  );
}
