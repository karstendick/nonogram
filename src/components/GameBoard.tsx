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

  // Use smaller cells for large puzzles on mobile to fit entire puzzle on screen
  const isLargePuzzle = width > 10 || height > 10;
  const mobileCellWidth = isLargePuzzle ? 'w-[22px]' : 'w-10';
  const mobileCellHeight = isLargePuzzle ? 'h-[22px]' : 'h-10';
  const mobilePadding = isLargePuzzle ? 'p-0.5' : 'p-1';
  const mobileClueTextSize = isLargePuzzle ? 'text-[0.5rem]' : 'text-xs';
  const mobileClueWidth = isLargePuzzle ? maxRowClues * 0.9 : maxRowClues * 1.25;
  // Column clues need full height for desktop to prevent cutoff
  const clueHeight = maxColClues * 1.5;

  return (
    <div className={`inline-block bg-gray-50 ${mobilePadding} sm:p-4 rounded-none sm:rounded-lg`}>
      {/* Top section: spacer + column clues */}
      <div className="flex gap-1 sm:gap-2 mb-1">
        {/* Top-left corner spacer */}
        <div
          className="shrink-0"
          style={{
            width: `${mobileClueWidth}rem`,
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
              className={`${mobileCellWidth} sm:w-12 flex flex-col items-center justify-end gap-0 sm:gap-0.5 pb-0.5 sm:pb-1`}
              style={{
                minHeight: `${clueHeight}rem`,
              }}
            >
              {clues.map((clue, idx) => (
                <div
                  key={idx}
                  className={`${mobileClueTextSize} sm:text-sm font-semibold text-center ${
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
      <div className="flex gap-1 sm:gap-2">
        {/* Row clues */}
        <div className="flex flex-col gap-0 shrink-0">
          {rowClues.map((clues, rowIndex) => (
            <div
              key={rowIndex}
              className={`${mobileCellHeight} sm:h-12 flex items-center justify-end gap-0.5 sm:gap-1 pr-0.5 sm:pr-2`}
              style={{
                minWidth: `${mobileClueWidth}rem`,
              }}
            >
              {clues.map((clue, idx) => (
                <div
                  key={idx}
                  className={`${mobileClueTextSize} sm:text-sm font-semibold text-center ${
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
