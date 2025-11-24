import { useState } from 'react';
import { useGameStore } from '../store/gameStore';

interface CompletionModalProps {
  onBackToSelection: () => void;
}

export function CompletionModal({ onBackToSelection }: CompletionModalProps) {
  const { isComplete, moves } = useGameStore();
  const [isAdmiring, setIsAdmiring] = useState(false);

  if (!isComplete || isAdmiring) return null;

  const handleAdmire = () => {
    setIsAdmiring(true);
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
          <button
            onClick={handleAdmire}
            className="w-full bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Admire Puzzle
          </button>
          <button
            onClick={onBackToSelection}
            className="w-full bg-white text-gray-700 font-semibold py-3 px-6 rounded-lg border-2 border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Back to Puzzle Selection
          </button>
        </div>
      </div>
    </div>
  );
}
