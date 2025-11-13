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
      // Right click: toggle between empty and marked empty
      newState = currentState === CellState.MarkedEmpty ? CellState.Empty : CellState.MarkedEmpty;
    } else {
      // Left click or tap: depends on mode (mobile) or just fill (desktop)
      if (currentMode === InteractionMode.MarkEmpty) {
        newState = currentState === CellState.MarkedEmpty ? CellState.Empty : CellState.MarkedEmpty;
      } else {
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
        gridTemplateColumns: `repeat(${currentPuzzle.width}, minmax(0, 1fr))`,
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
            onCellClick={handleCellClick}
          />
        ))
      )}
    </div>
  );
}
