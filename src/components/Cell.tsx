import { CellState } from '../types';

interface CellProps {
  state: CellState;
  row: number;
  col: number;
  gridWidth: number;
  gridHeight: number;
  onCellClick: (row: number, col: number, isRightClick: boolean) => void;
}

export function Cell({ state, row, col, gridWidth, gridHeight, onCellClick }: CellProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onCellClick(row, col, false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onCellClick(row, col, true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCellClick(row, col, false);
    }
  };

  const getCellClasses = () => {
    const base =
      'w-10 h-10 sm:w-12 sm:h-12 border border-gray-400 flex items-center justify-center cursor-pointer transition-colors select-none';

    // Add thicker borders every 5 rows/columns for better readability (internal only, not edges)
    const gridLines = [];
    if ((col + 1) % 5 === 0 && col + 1 < gridWidth) {
      gridLines.push('border-r-2 border-r-gray-700');
    }
    if ((row + 1) % 5 === 0 && row + 1 < gridHeight) {
      gridLines.push('border-b-2 border-b-gray-700');
    }

    const gridLineClasses = gridLines.join(' ');

    switch (state) {
      case CellState.Filled:
        return `${base} ${gridLineClasses} bg-gray-800 hover:bg-gray-700`;
      case CellState.MarkedEmpty:
        return `${base} ${gridLineClasses} bg-white hover:bg-gray-100`;
      case CellState.Empty:
      default:
        return `${base} ${gridLineClasses} bg-white hover:bg-gray-50`;
    }
  };

  return (
    <div
      role="gridcell"
      tabIndex={-1}
      className={getCellClasses()}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      aria-label={`Cell ${row + 1}, ${col + 1}`}
    >
      {state === CellState.MarkedEmpty && (
        <span className="text-gray-400 text-sm sm:text-base font-bold">×</span>
      )}
    </div>
  );
}
