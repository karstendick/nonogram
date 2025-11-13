import { useGameStore } from '../store/gameStore';

export function Controls() {
  const { resetPuzzle, undo, redo, canUndo, canRedo, checkSolution, isComplete } = useGameStore();

  const handleCheck = () => {
    const correct = checkSolution();
    if (correct) {
      alert('Congratulations! You solved the puzzle!');
    } else {
      alert('Not quite right. Keep trying!');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Undo/Redo buttons */}
      <div className="flex gap-2">
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Undo
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Redo
        </button>
      </div>

      {/* Reset and Check buttons */}
      <div className="flex gap-2">
        <button
          onClick={resetPuzzle}
          className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-md font-medium hover:bg-red-200 transition-colors"
        >
          Reset
        </button>
        <button
          onClick={handleCheck}
          className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
            isComplete ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isComplete ? 'Solved!' : 'Check'}
        </button>
      </div>
    </div>
  );
}
