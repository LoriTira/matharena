'use client';

import { useMatchmaking } from '@/hooks/useMatchmaking';

export default function PlayPage() {
  const { isSearching, error, findMatch, cancel } = useMatchmaking();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <h1 className="text-4xl font-bold text-white">Ranked Match</h1>
      <p className="text-gray-400 text-lg max-w-md text-center">
        Compete head-to-head against another player. First to solve 5 problems wins.
        Your Elo rating is on the line!
      </p>

      {error && (
        <div className="text-red-400 bg-red-950 border border-red-800 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {isSearching ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-300 text-lg">Finding an opponent...</p>
          <button
            onClick={cancel}
            className="px-6 py-2 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={findMatch}
          className="px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold rounded-xl transition-colors shadow-lg shadow-blue-600/20"
        >
          Find Match
        </button>
      )}
    </div>
  );
}
