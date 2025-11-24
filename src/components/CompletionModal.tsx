import { useGameStore } from '../store/gameStore';

export function CompletionModal() {
  const { isComplete, moves, resetPuzzle } = useGameStore();

  if (!isComplete) return null;

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

        {/* Action button */}
        <button
          onClick={resetPuzzle}
          className="w-full bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
