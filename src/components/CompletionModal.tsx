import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { generateRandomPuzzle, isGeneratedPuzzle } from '../logic/randomPuzzle';
import type { Puzzle } from '../types';

interface CompletionModalProps {
  onBackToSelection: () => void;
  onPlayAnother: (puzzle: Puzzle) => void;
}

export function CompletionModal({ onBackToSelection, onPlayAnother }: CompletionModalProps) {
  const { isComplete, moves, currentPuzzle } = useGameStore();
  const [isAdmiring, setIsAdmiring] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isComplete || isAdmiring) return null;

  // Only generated puzzles can be re-rolled — pre-made puzzles have no "more like this"
  const canPlayAnother = isGeneratedPuzzle(currentPuzzle);
  const size = currentPuzzle?.width ?? 0;

  const handleAdmire = () => {
    setIsAdmiring(true);
  };

  const handlePlayAnother = () => {
    setIsGenerating(true);

    // Run generation in a timeout to allow UI to update
    setTimeout(() => {
      const puzzle = generateRandomPuzzle(size);

      setIsGenerating(false);

      if (puzzle) {
        onPlayAnother(puzzle);
      } else {
        // Retry if every seed we tried failed to produce a valid puzzle
        handlePlayAnother();
      }
    }, 10);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full animate-scale-in">
        {/* Celebration emoji */}
        <div className="text-6xl text-center mb-4">🎉</div>

        {/* Success message */}
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-2">
          Puzzle Complete!
        </h2>

        <p className="text-center text-gray-600 mb-6">
          Congratulations! You solved the puzzle in {moves} move{moves !== 1 ? 's' : ''}.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          {canPlayAnother && (
            <button
              onClick={handlePlayAnother}
              disabled={isGenerating}
              className={`w-full font-semibold py-3 px-6 rounded-lg transition-colors ${
                isGenerating
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isGenerating ? 'Generating...' : `Play Another ${size}×${size}`}
            </button>
          )}
          <button
            onClick={handleAdmire}
            disabled={isGenerating}
            className="w-full bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Admire Puzzle
          </button>
          <button
            onClick={onBackToSelection}
            disabled={isGenerating}
            className="w-full bg-white text-gray-700 font-semibold py-3 px-6 rounded-lg border-2 border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Back to Puzzle Selection
          </button>
        </div>
      </div>
    </div>
  );
}
