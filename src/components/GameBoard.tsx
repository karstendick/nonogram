import { Grid } from './Grid';
import { useGameStore } from '../store/gameStore';
import { CellState } from '../types';

export function GameBoard() {
  const { currentPuzzle, playerGrid, markMultipleCells } = useGameStore();

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

  // Handle clicking a completed row clue
  const handleRowClueClick = (rowIndex: number) => {
    if (!isRowComplete(rowIndex)) return;

    // Find all empty cells in this row
    const cellsToMark = [];
    for (let col = 0; col < width; col++) {
      if (playerGrid[rowIndex][col] === CellState.Empty) {
        cellsToMark.push({ row: rowIndex, col, state: CellState.MarkedEmpty });
      }
    }

    if (cellsToMark.length > 0) {
      markMultipleCells(cellsToMark);
    }
  };

  // Handle clicking a completed column clue
  const handleColClueClick = (colIndex: number) => {
    if (!isColComplete(colIndex)) return;

    // Find all empty cells in this column
    const cellsToMark = [];
    for (let row = 0; row < height; row++) {
      if (playerGrid[row][colIndex] === CellState.Empty) {
        cellsToMark.push({ row, col: colIndex, state: CellState.MarkedEmpty });
      }
    }

    if (cellsToMark.length > 0) {
      markMultipleCells(cellsToMark);
    }
  };

  // Find max number of clues for any row (for width calculation)
  const maxRowClues = Math.max(...rowClues.map((clue) => clue.length));

  // Find max number of clues for any column (for height calculation)
  const maxColClues = Math.max(...columnClues.map((clue) => clue.length));

  // Use smaller cells for large puzzles on mobile to fit entire puzzle on screen
  const isLargePuzzle = width > 10 || height > 10;
  const mobileCellWidth = isLargePuzzle ? 'w-[22px]' : 'w-10';
  const mobileCellHeight = isLargePuzzle ? 'h-[22px]' : 'h-10';
  const mobilePadding = isLargePuzzle ? 'p-0' : 'p-1';
  const mobileClueTextSize = isLargePuzzle ? 'text-[0.5rem]' : 'text-xs';
  const mobileClueWidth = isLargePuzzle ? maxRowClues * 0.9 : maxRowClues * 1.25;
  const mobileGap = isLargePuzzle ? 'gap-0' : 'gap-1';
  const mobileRowCluePadding = isLargePuzzle ? 'pr-0' : 'pr-0.5';
  const mobileColCluePadding = isLargePuzzle ? 'pb-0' : 'pb-0.5';
  // Column clues need full height for desktop to prevent cutoff
  const clueHeight = maxColClues * 1.5;

  return (
    <div className={`inline-block bg-gray-50 ${mobilePadding} sm:p-4 rounded-none sm:rounded-lg`}>
      {/* Top section: spacer + column clues */}
      <div className={`flex ${mobileGap} sm:gap-2 mb-0 sm:mb-1`}>
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
          {columnClues.map((clues, colIndex) => {
            const isComplete = isColComplete(colIndex);
            return (
              <div
                key={colIndex}
                role={isComplete ? 'button' : undefined}
                tabIndex={isComplete ? 0 : undefined}
                onClick={() => handleColClueClick(colIndex)}
                onKeyDown={(e) => {
                  if (isComplete && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleColClueClick(colIndex);
                  }
                }}
                className={`${mobileCellWidth} sm:w-12 flex flex-col items-center justify-end gap-0 sm:gap-0.5 ${mobileColCluePadding} sm:pb-1 select-none ${
                  isComplete ? 'cursor-pointer hover:bg-gray-100 rounded' : ''
                }`}
                style={{
                  minHeight: `${clueHeight}rem`,
                }}
              >
                {clues.map((clue, idx) => (
                  <div
                    key={idx}
                    className={`${mobileClueTextSize} sm:text-sm font-semibold text-center ${
                      isComplete ? 'text-gray-400 line-through' : 'text-gray-700'
                    }`}
                  >
                    {clue}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom section: row clues + grid */}
      <div className={`flex ${mobileGap} sm:gap-2`}>
        {/* Row clues */}
        <div className="flex flex-col gap-0 shrink-0">
          {rowClues.map((clues, rowIndex) => {
            const isComplete = isRowComplete(rowIndex);
            return (
              <div
                key={rowIndex}
                role={isComplete ? 'button' : undefined}
                tabIndex={isComplete ? 0 : undefined}
                onClick={() => handleRowClueClick(rowIndex)}
                onKeyDown={(e) => {
                  if (isComplete && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleRowClueClick(rowIndex);
                  }
                }}
                className={`${mobileCellHeight} sm:h-12 flex items-center justify-end gap-0.5 sm:gap-1 ${mobileRowCluePadding} sm:pr-2 select-none ${
                  isComplete ? 'cursor-pointer hover:bg-gray-100 rounded' : ''
                }`}
                style={{
                  minWidth: `${mobileClueWidth}rem`,
                }}
              >
                {clues.map((clue, idx) => (
                  <div
                    key={idx}
                    className={`${mobileClueTextSize} sm:text-sm font-semibold text-center ${
                      isComplete ? 'text-gray-400 line-through' : 'text-gray-700'
                    }`}
                  >
                    {clue}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Game grid */}
        <Grid />
      </div>
    </div>
  );
}
