import { useEffect } from 'react';
import { GameBoard } from './components/GameBoard';
import { ModeToggle } from './components/ModeToggle';
import { Controls } from './components/Controls';
import { useGameStore } from './store/gameStore';
import { parsePuzzle } from './logic/puzzleParser';
import puzzlesData from './data/puzzles.json';
import type { PuzzleCollection } from './types';

function App() {
  const { currentPuzzle, loadPuzzle } = useGameStore();

  // Load the first puzzle on mount
  useEffect(() => {
    const data = puzzlesData as PuzzleCollection;
    const firstPuzzleData = data.puzzles[0];
    if (firstPuzzleData) {
      const puzzle = parsePuzzle(firstPuzzleData);
      loadPuzzle(puzzle);
    }
  }, [loadPuzzle]);

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

      {/* Mobile Mode Toggle */}
      <div className="w-full max-w-xs mb-4 sm:hidden">
        <ModeToggle />
      </div>

      {/* Game Board */}
      <div className="mb-6">
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
