import { useEffect, useState } from 'react';
import { Puzzle } from '../types';
import { LevelSelector } from './LevelSelector';
import { SizeSelector } from './SizeSelector';
import { PuzzleCodeEntry } from './PuzzleCodeEntry';
import { GenerationProgress } from './GenerationProgress';
import { levelById, levelForRating } from '../logic/generation/levels';
import { generationService, speculateWhenIdle } from '../logic/generation/service';
import type { GenerationStats } from '../logic/generation/strategy';
import { useGameStore } from '../store/gameStore';

interface LandingPageProps {
  onPuzzleSelected: (puzzle: Puzzle) => void;
  onNavigateToPremade: () => void;
}

export function LandingPage({ onPuzzleSelected, onNavigateToPremade }: LandingPageProps) {
  const lastLevelId = useGameStore((state) => state.lastLevelId);
  const setLastLevelId = useGameStore((state) => state.setLastLevelId);
  const lastSize = useGameStore((state) => state.lastSize);
  const setLastSize = useGameStore((state) => state.setLastSize);
  const [levelId, setLevelId] = useState(lastLevelId);
  const [size, setSize] = useState(lastSize);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState<GenerationStats | null>(null);
  const [failed, setFailed] = useState(false);
  /** Set when generation ran out of budget and settled for a nearer miss. */
  const [missed, setMissed] = useState<string | null>(null);

  // Start generating before being asked, using the time the player spends
  // reading this page and choosing. Deferred to idle so it cannot slow the
  // page's first paint — that would trade a wait nobody notices for one they do.
  useEffect(() => {
    speculateWhenIdle(lastSize, lastLevelId);
  }, [lastSize, lastLevelId]);

  // Changing either control makes any in-flight speculation useless, so start
  // again on the new target rather than leaving the player to wait for it later.
  const handleLevelChange = (next: number) => {
    setLevelId(next);
    generationService.speculate(size, next);
  };

  const handleSizeChange = (next: number) => {
    setSize(next);
    generationService.speculate(next, levelId);
  };

  const handleQuickPlay = () => {
    setIsGenerating(true);
    setStats(null);
    setFailed(false);
    setMissed(null);
    setLastLevelId(levelId);
    setLastSize(size);

    void generationService
      .take(size, levelId, (progress) => setStats(progress.stats))
      .then((result) => {
        setIsGenerating(false);
        if (!result) {
          setFailed(true);
          return;
        }
        // The budget can run out with only a nearer miss to show for it. Say so
        // rather than handing over a different difficulty in silence.
        if (!result.inBand) {
          setMissed(levelForRating(result.rating).name);
        }
        onPuzzleSelected(result.puzzle);
      });
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
          <p className="text-sm text-gray-600 mb-4">Start a random puzzle</p>

          <div className="mb-4">
            <LevelSelector value={levelId} onChange={handleLevelChange} disabled={isGenerating} />
          </div>

          <div className="mb-4">
            <SizeSelector value={size} onChange={handleSizeChange} disabled={isGenerating} />
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
            {isGenerating ? 'Generating…' : 'Play Random Puzzle'}
          </button>

          {isGenerating && <GenerationProgress stats={stats} />}

          {failed && (
            <p className="mt-3 text-sm text-red-700 text-center">
              Could not find a puzzle at that level. Try again, or pick another level.
            </p>
          )}

          {missed && (
            <p className="mt-3 text-sm text-amber-700 text-center">
              Could not find a {levelById(levelId).name} puzzle in time — this one is {missed}.
            </p>
          )}
        </div>

        {/* Enter a code */}
        <PuzzleCodeEntry onPuzzleLoaded={onPuzzleSelected} />

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
