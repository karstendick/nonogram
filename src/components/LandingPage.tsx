import { useState } from 'react';
import { Puzzle } from '../types';
import { generateRandomPuzzle } from '../logic/randomPuzzle';

interface LandingPageProps {
  onPuzzleSelected: (puzzle: Puzzle) => void;
  onNavigateToSeedEntry: () => void;
  onNavigateToPremade: () => void;
}

export function LandingPage({
  onPuzzleSelected,
  onNavigateToSeedEntry,
  onNavigateToPremade,
}: LandingPageProps) {
  const [size, setSize] = useState<5 | 10 | 15>(15);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleQuickPlay = () => {
    setIsGenerating(true);

    // Run generation in a timeout to allow UI to update
    setTimeout(() => {
      const puzzle = generateRandomPuzzle(size);

      setIsGenerating(false);

      if (puzzle) {
        onPuzzleSelected(puzzle);
      } else {
        // Retry if every seed we tried failed to produce a valid puzzle
        handleQuickPlay();
      }
    }, 10);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center p-4 sm:p-8">
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-5xl font-bold text-gray-800 mb-2">🧩 Nonogram Puzzle</h1>
        <p className="text-gray-600 text-sm sm:text-base">Pick a puzzle and start playing!</p>
      </div>

      <div className="w-full max-w-md space-y-4">
        {/* Quick Play Card */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-md p-6 border-2 border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎲</span>
            <h2 className="text-xl font-bold text-gray-800">Quick Play</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">Start a random puzzle immediately</p>

          {/* Size selector */}
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Size:</div>
            <div className="flex gap-4 justify-center">
              {([5, 10, 15] as const).map((s) => (
                <label key={s} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="size"
                    value={s}
                    checked={size === s}
                    onChange={() => setSize(s)}
                    disabled={isGenerating}
                    className="mr-2 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 font-medium">
                    {s}×{s}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Play button */}
          <button
            onClick={handleQuickPlay}
            disabled={isGenerating}
            className={`w-full py-3 px-4 rounded-md font-semibold transition-colors ${
              isGenerating
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg'
            }`}
          >
            {isGenerating ? 'Generating...' : 'Play Random Puzzle'}
          </button>
        </div>

        {/* Enter Seed Card */}
        <button
          onClick={onNavigateToSeedEntry}
          className="w-full bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔑</span>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Enter a Seed</h2>
                <p className="text-sm text-gray-600">
                  Use a specific seed to play or share puzzles
                </p>
              </div>
            </div>
            <span className="text-gray-400 group-hover:text-gray-600 transition-colors text-xl">
              →
            </span>
          </div>
        </button>

        {/* Pre-made Puzzles Card */}
        <button
          onClick={onNavigateToPremade}
          className="w-full bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📚</span>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Pre-made Puzzles</h2>
                <p className="text-sm text-gray-600">Browse our curated collection</p>
              </div>
            </div>
            <span className="text-gray-400 group-hover:text-gray-600 transition-colors text-xl">
              →
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
