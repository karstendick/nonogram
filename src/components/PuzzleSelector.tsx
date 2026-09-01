import { Puzzle } from '../types';
import puzzlesData from '../data/puzzles.json';
import type { PuzzleCollection } from '../types';
import { parsePuzzle } from '../logic/puzzleParser';
import { RatingBadge } from './RatingBadge';

interface PuzzleSelectorProps {
  onPuzzleSelected: (puzzle: Puzzle) => void;
  currentPuzzleId?: string;
}

export function PuzzleSelector({ onPuzzleSelected, currentPuzzleId }: PuzzleSelectorProps) {
  const data = puzzlesData as PuzzleCollection;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Pre-made Puzzles</h2>
      <div className="space-y-2">
        {data.puzzles.map((puzzleData) => {
          const puzzle = parsePuzzle(puzzleData);
          const isSelected = currentPuzzleId === puzzle.id;

          return (
            <button
              key={puzzle.id}
              onClick={() => onPuzzleSelected(puzzle)}
              className={`w-full text-left px-4 py-3 rounded-md transition-colors ${
                isSelected
                  ? 'bg-purple-100 border-2 border-purple-500'
                  : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-800">{puzzle.title}</span>
                <span className="text-xs text-gray-500">
                  {puzzle.width}×{puzzle.height}
                </span>
              </div>
              <RatingBadge rating={puzzle.rating} className="text-sm mt-1" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
