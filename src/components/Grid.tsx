import { useRef, useEffect } from 'react';
import { Cell } from './Cell';
import { useGameStore } from '../store/gameStore';
import { CellState, InteractionMode } from '../types';

export function Grid() {
  const { currentPuzzle, playerGrid, currentMode, setCellState, startDrag, continueDrag, endDrag } =
    useGameStore();
  const gridRef = useRef<HTMLDivElement>(null);

  // Add global mouse up listener to end drag
  useEffect(() => {
    const handleMouseUp = () => {
      endDrag();
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [endDrag]);

  if (!currentPuzzle) {
    return <div>No puzzle loaded</div>;
  }

  // Determine what action to perform based on current state and mode
  const getToggleAction = (row: number, col: number, isRightClick: boolean): CellState => {
    const currentState = playerGrid[row][col];

    if (isRightClick) {
      // Right click: toggle between empty and marked empty
      return currentState === CellState.MarkedEmpty ? CellState.Empty : CellState.MarkedEmpty;
    } else {
      // Left click or tap: depends on mode (mobile) or just fill (desktop)
      if (currentMode === InteractionMode.MarkEmpty) {
        // Mark empty mode: toggle between empty and marked empty
        return currentState === CellState.MarkedEmpty ? CellState.Empty : CellState.MarkedEmpty;
      } else {
        // Fill mode: toggle between empty and filled
        return currentState === CellState.Filled ? CellState.Empty : CellState.Filled;
      }
    }
  };

  const handleCellClick = (row: number, col: number, isRightClick: boolean) => {
    const currentState = playerGrid[row][col];
    const newState = getToggleAction(row, col, isRightClick);

    // Check constraints before applying
    if (newState === CellState.Filled && currentState === CellState.MarkedEmpty) {
      return; // Cannot fill a marked empty cell
    }
    if (newState === CellState.MarkedEmpty && currentState === CellState.Filled) {
      return; // Cannot mark empty a filled cell
    }

    setCellState(row, col, newState);
  };

  const handleCellDragStart = (row: number, col: number, isRightClick: boolean) => {
    const action = getToggleAction(row, col, isRightClick);
    startDrag(row, col, action);
  };

  const handleCellDragEnter = (row: number, col: number) => {
    continueDrag(row, col);
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
            onCellDragStart={handleCellDragStart}
            onCellDragEnter={handleCellDragEnter}
          />
        ))
      )}
    </div>
  );
}
