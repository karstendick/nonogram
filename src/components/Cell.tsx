import { CellState } from '../types';

interface CellProps {
  state: CellState;
  row: number;
  col: number;
  onCellClick: (row: number, col: number, isRightClick: boolean) => void;
}

export function Cell({ state, row, col, onCellClick }: CellProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onCellClick(row, col, false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onCellClick(row, col, true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    onCellClick(row, col, false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCellClick(row, col, false);
    }
  };

  const getCellClasses = () => {
    const base =
      'w-8 h-8 sm:w-10 sm:h-10 border border-gray-400 flex items-center justify-center cursor-pointer transition-colors select-none';

    switch (state) {
      case CellState.Filled:
        return `${base} bg-gray-800 hover:bg-gray-700`;
      case CellState.MarkedEmpty:
        return `${base} bg-white hover:bg-gray-100`;
      case CellState.Empty:
      default:
        return `${base} bg-white hover:bg-gray-50`;
    }
  };

  return (
    <div
      role="gridcell"
      tabIndex={-1}
      className={getCellClasses()}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
      aria-label={`Cell ${row + 1}, ${col + 1}`}
    >
      {state === CellState.MarkedEmpty && (
        <span className="text-gray-400 text-sm sm:text-base font-bold">×</span>
      )}
    </div>
  );
}
