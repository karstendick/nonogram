import { useEffect, useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { ModeToggle } from './components/ModeToggle';
import { Controls } from './components/Controls';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center p-4 sm:p-8">
      {/* Header */}
      <div className="text-center mb-6">
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
      </div>

      {/* Back button */}
      <button
        onClick={() => setView('select')}
        className="mb-4 px-4 py-2 bg-white text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
      >
        ← Back to Puzzle Selection
      </button>

      {/* Mobile Mode Toggle */}
      <div className="w-full max-w-xs mb-4 sm:hidden">
        <ModeToggle />
      </div>

      {/* Game Board */}
      <div className="mb-6 w-full overflow-x-auto overflow-y-auto max-h-[70vh] flex justify-center">
        <GameBoard />
      </div>

      {/* Controls */}
      <div className="w-full max-w-md">
        <Controls />
      </div>

      {/* Instructions */}
      <div className="mt-8 max-w-md text-center text-sm text-gray-600">
        <p className="mb-2">
          <span className="font-semibold">Desktop:</span> Left-click to fill, right-click to mark
          empty
        </p>
        <p className="sm:hidden">
          <span className="font-semibold">Mobile:</span> Use the toggle above to switch modes
        </p>
      </div>
    </div>
  );
}

export default App;
