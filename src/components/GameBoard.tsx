import { Grid } from './Grid';
import { useGameStore } from '../store/gameStore';
import { CellState } from '../types';

export function GameBoard() {
  const { currentPuzzle, playerGrid } = useGameStore();

  if (!currentPuzzle) {
    return <div className="text-gray-600">No puzzle loaded</div>;
  }

  const { rowClues, columnClues, width, height } = currentPuzzle;

  // Check if a row is complete
  const isRowComplete = (rowIndex: number): boolean => {
    const row = playerGrid[rowIndex];
    const solution = currentPuzzle.solution[rowIndex];

    for (let col = 0; col < width; col++) {
      const playerFilled = row[col] === CellState.Filled;
      const solutionFilled = solution[col];
      if (playerFilled !== solutionFilled) {
        return false;
      }
    }
    return true;
  };

  // Check if a column is complete
  const isColComplete = (colIndex: number): boolean => {
    for (let row = 0; row < height; row++) {
      const playerFilled = playerGrid[row][colIndex] === CellState.Filled;
      const solutionFilled = currentPuzzle.solution[row][colIndex];
      if (playerFilled !== solutionFilled) {
        return false;
      }
    }
    return true;
  };

  // Find max number of clues for any row (for width calculation)
  const maxRowClues = Math.max(...rowClues.map((clue) => clue.length));

  // Find max number of clues for any column (for height calculation)
  const maxColClues = Math.max(...columnClues.map((clue) => clue.length));

  return (
    <div className="inline-block bg-gray-50 p-4 rounded-lg">
      {/* Top section: spacer + column clues */}
      <div className="flex gap-2 mb-1">
        {/* Top-left corner spacer */}
        <div
          style={{
            width: `${maxRowClues * 2.5}rem`,
          }}
        />
        {/* Column clues */}
        <div
          className="grid gap-0"
          style={{
            gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
          }}
        >
          {columnClues.map((clues, colIndex) => (
            <div
              key={colIndex}
              className="w-8 sm:w-10 flex flex-col items-center justify-end gap-0.5 pb-1"
              style={{
                height: `${maxColClues * 1.5}rem`,
              }}
            >
              {clues.map((clue, idx) => (
                <div
                  key={idx}
                  className={`text-xs sm:text-sm font-semibold text-center ${
                    isColComplete(colIndex) ? 'text-gray-400 line-through' : 'text-gray-700'
                  }`}
                >
                  {clue}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom section: row clues + grid */}
      <div className="flex gap-2">
        {/* Row clues */}
        <div className="flex flex-col gap-0">
          {rowClues.map((clues, rowIndex) => (
            <div
              key={rowIndex}
              className="h-8 sm:h-10 flex items-center justify-end gap-1 pr-1 sm:pr-2"
              style={{
                minWidth: `${maxRowClues * 2.5}rem`,
              }}
            >
              {clues.map((clue, idx) => (
                <div
                  key={idx}
                  className={`text-xs sm:text-sm font-semibold text-center ${
                    isRowComplete(rowIndex) ? 'text-gray-400 line-through' : 'text-gray-700'
                  }`}
                >
                  {clue}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Game grid */}
        <Grid />
      </div>
    </div>
  );
}
