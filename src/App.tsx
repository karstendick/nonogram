import { useEffect, useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { ModeToggle } from './components/ModeToggle';
import { CompletionModal } from './components/CompletionModal';
import { PuzzleSelector } from './components/PuzzleSelector';
import { PuzzleGenerator } from './components/PuzzleGenerator';
import { useGameStore } from './store/gameStore';
import { parsePuzzle } from './logic/puzzleParser';
import puzzlesData from './data/puzzles.json';
import type { PuzzleCollection, Puzzle } from './types';

// Component to display and copy puzzle seed
function SeedDisplay({ seed, className = '' }: { seed: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    navigator.clipboard
      .writeText(seed)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy seed:', err);
      });
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono bg-gray-100 hover:bg-gray-200 rounded transition-colors ${className}`}
      title="Click to copy seed"
    >
      <span className="text-gray-600">Seed:</span>
      <span className="font-semibold text-gray-800">{seed}</span>
      {copied ? (
        <span className="text-green-600 font-semibold">✓</span>
      ) : (
        <span className="text-gray-400">📋</span>
      )}
    </button>
  );
}

function App() {
  const { currentPuzzle, loadPuzzle } = useGameStore();
  const [view, setView] = useState<'game' | 'select'>('select');
  const [tab, setTab] = useState<'premade' | 'generate'>('premade');

  // Check if the current puzzle is generated (vs pre-made)
  const isGeneratedPuzzle = currentPuzzle?.title.startsWith('Generated');

  // Load the first puzzle on mount
  useEffect(() => {
    const data = puzzlesData as PuzzleCollection;
    const firstPuzzleData = data.puzzles[0];
    if (firstPuzzleData) {
      const puzzle = parsePuzzle(firstPuzzleData);
      loadPuzzle(puzzle);
    }
  }, [loadPuzzle]);

  const handlePuzzleSelected = (puzzle: Puzzle) => {
    loadPuzzle(puzzle);
    setView('game');
  };

  if (view === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center p-4 sm:p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">Nonogram Puzzle</h1>
          <p className="text-gray-600">Select or generate a puzzle to play</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('premade')}
            className={`px-6 py-2 rounded-md font-semibold transition-colors ${
              tab === 'premade'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Pre-made Puzzles
          </button>
          <button
            onClick={() => setTab('generate')}
            className={`px-6 py-2 rounded-md font-semibold transition-colors ${
              tab === 'generate'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Generate Puzzle
          </button>
        </div>

        {/* Content */}
        {tab === 'premade' ? (
          <PuzzleSelector
            onPuzzleSelected={handlePuzzleSelected}
            currentPuzzleId={currentPuzzle?.id}
          />
        ) : (
          <PuzzleGenerator onPuzzleGenerated={handlePuzzleSelected} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white sm:bg-gradient-to-br sm:from-blue-50 sm:to-indigo-100 flex flex-col items-center sm:p-8">
      {/* Header - minimal on mobile, full on desktop */}
      <div className="w-full sm:text-center sm:mb-6">
        {/* Mobile header - compact */}
        <div className="sm:hidden px-2 py-2 bg-gray-50">
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={() => setView('select')}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Back to puzzle selection"
            >
              ← Back
            </button>
            {currentPuzzle && (
              <div className="text-xs text-gray-600">
                {currentPuzzle.width} × {currentPuzzle.height}
              </div>
            )}
          </div>
          {currentPuzzle && isGeneratedPuzzle && (
            <div className="flex justify-center">
              <SeedDisplay seed={currentPuzzle.id} />
            </div>
          )}
        </div>

        {/* Desktop header - full */}
        <div className="hidden sm:block">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">Nonogram Puzzle</h1>
          {currentPuzzle && (
            <>
              <div className="text-sm sm:text-base text-gray-600">
                <span className="font-semibold">{currentPuzzle.title}</span>
                <span className="mx-2">•</span>
                <span className="capitalize">{currentPuzzle.difficulty}</span>
                <span className="mx-2">•</span>
                <span>
                  {currentPuzzle.width} × {currentPuzzle.height}
                </span>
              </div>
              {isGeneratedPuzzle && (
                <div className="mt-2 flex justify-center">
                  <SeedDisplay seed={currentPuzzle.id} />
                </div>
              )}
            </>
          )}
          <button
            onClick={() => setView('select')}
            className="mt-4 px-4 py-2 bg-white text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
          >
            ← Back to Puzzle Selection
          </button>
        </div>
      </div>

      {/* Game Board - maximize space on mobile */}
      <div className="w-full flex-1 overflow-x-auto overflow-y-auto flex flex-col items-center sm:mb-6 sm:flex-initial sm:max-h-[70vh]">
        <GameBoard />
        {/* Mobile Mode Toggle - directly below puzzle */}
        <div className="w-full px-2 mt-1 mb-2 sm:hidden">
          <ModeToggle />
        </div>
      </div>

      {/* Help tooltip - desktop only */}
      <div className="hidden sm:block mt-8">
        <div className="relative inline-block group">
          <button
            className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors text-gray-600 hover:text-gray-800"
            aria-label="Show help"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
          <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg whitespace-nowrap shadow-lg pointer-events-none">
            <div className="text-center">
              <span className="font-semibold">Desktop:</span> Left-click to fill, right-click to
              mark empty
            </div>
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="border-4 border-transparent border-t-gray-800"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      <CompletionModal onBackToSelection={() => setView('select')} />
    </div>
  );
}

export default App;
