import { useRef } from 'react';
import { Cell } from './Cell';
import { useGameStore } from '../store/gameStore';
import { CellState, InteractionMode } from '../types';

export function Grid() {
  const { currentPuzzle, playerGrid, currentMode, setCellState } = useGameStore();
  const gridRef = useRef<HTMLDivElement>(null);

  if (!currentPuzzle) {
    return <div>No puzzle loaded</div>;
  }

  const handleCellClick = (row: number, col: number, isRightClick: boolean) => {
    const currentState = playerGrid[row][col];

    let newState: CellState;

    if (isRightClick) {
      // Right click: toggle between empty and marked empty (only if not filled)
      if (currentState === CellState.Filled) {
        return; // Cannot mark empty a filled cell
      }
      newState = currentState === CellState.MarkedEmpty ? CellState.Empty : CellState.MarkedEmpty;
    } else {
      // Left click or tap: depends on mode (mobile) or just fill (desktop)
      if (currentMode === InteractionMode.MarkEmpty) {
        // Mark empty mode: toggle between empty and marked empty (only if not filled)
        if (currentState === CellState.Filled) {
          return; // Cannot mark empty a filled cell
        }
        newState = currentState === CellState.MarkedEmpty ? CellState.Empty : CellState.MarkedEmpty;
      } else {
        // Fill mode: toggle between empty and filled (only if not marked empty)
        if (currentState === CellState.MarkedEmpty) {
          return; // Cannot fill a marked empty cell
        }
        newState = currentState === CellState.Filled ? CellState.Empty : CellState.Filled;
      }
    }

    setCellState(row, col, newState);
  };

  return (
    <div
      ref={gridRef}
      role="grid"
      tabIndex={0}
      className="grid gap-0 bg-white shadow-md"
      style={{
        gridTemplateColumns: `repeat(${currentPuzzle.width}, auto)`,
      }}
      aria-label="Nonogram game grid"
    >
      {playerGrid.map((row, rowIndex) =>
        row.map((cellState, colIndex) => (
          <Cell
            key={`${rowIndex}-${colIndex}`}
            state={cellState}
            row={rowIndex}
            col={colIndex}
            gridWidth={currentPuzzle.width}
            gridHeight={currentPuzzle.height}
            solutionValue={currentPuzzle.solution[rowIndex][colIndex]}
            onCellClick={handleCellClick}
          />
        ))
      )}
    </div>
  );
}
