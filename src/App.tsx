import { useEffect, useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { ModeToggle } from './components/ModeToggle';
import { Controls } from './components/Controls';
import { CompletionModal } from './components/CompletionModal';
import { PuzzleSelector } from './components/PuzzleSelector';
import { PuzzleGenerator } from './components/PuzzleGenerator';
import { useGameStore } from './store/gameStore';
import { parsePuzzle } from './logic/puzzleParser';
import puzzlesData from './data/puzzles.json';
import type { PuzzleCollection, Puzzle } from './types';

function App() {
  const { currentPuzzle, loadPuzzle } = useGameStore();
  const [view, setView] = useState<'game' | 'select'>('select');
  const [tab, setTab] = useState<'premade' | 'generate'>('premade');

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
        <div className="sm:hidden flex items-center justify-between px-2 py-2 bg-gray-50">
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

        {/* Desktop header - full */}
        <div className="hidden sm:block">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">Nonogram Puzzle</h1>
          {currentPuzzle && (
            <div className="text-sm sm:text-base text-gray-600">
              <span className="font-semibold">{currentPuzzle.title}</span>
              <span className="mx-2">•</span>
              <span className="capitalize">{currentPuzzle.difficulty}</span>
              <span className="mx-2">•</span>
              <span>
                {currentPuzzle.width} × {currentPuzzle.height}
              </span>
            </div>
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
      <div className="w-full flex-1 overflow-x-auto overflow-y-auto flex justify-center items-start sm:mb-6 sm:flex-initial sm:max-h-[70vh]">
        <GameBoard />
      </div>

      {/* Mobile Mode Toggle - below puzzle */}
      <div className="w-full px-2 mt-0.5 mb-2 sm:hidden">
        <ModeToggle />
      </div>

      {/* Controls - compact on mobile */}
      <div className="w-full px-2 pb-2 sm:max-w-md sm:px-0">
        <Controls />
      </div>

      {/* Instructions - desktop only */}
      <div className="hidden sm:block mt-8 max-w-md text-center text-sm text-gray-600">
        <p className="mb-2">
          <span className="font-semibold">Desktop:</span> Left-click to fill, right-click to mark
          empty
        </p>
      </div>

      {/* Completion Modal */}
      <CompletionModal onBackToSelection={() => setView('select')} />
    </div>
  );
}

export default App;
