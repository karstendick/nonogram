import { useRef } from 'react';
import { CellState } from '../types';

interface CellProps {
  state: CellState;
  row: number;
  col: number;
  gridWidth: number;
  gridHeight: number;
  solutionValue: boolean;
  // Replay renders a read-only board: no input, no hover affordance, and marks
  // fade in as they appear.
  interactive?: boolean;
  animateMarks?: boolean;
  // Both callbacks take the player's intent, not which button produced it:
  // right-click and shift+left-click are the same gesture as far as the grid
  // is concerned.
  onCellClick: (row: number, col: number, markEmpty: boolean) => void;
  onCellDragStart: (row: number, col: number, markEmpty: boolean) => void;
  onCellDragEnter: (row: number, col: number) => void;
}

export function Cell({
  state,
  row,
  col,
  gridWidth,
  gridHeight,
  solutionValue,
  interactive = true,
  animateMarks = false,
  onCellClick,
  onCellDragStart,
  onCellDragEnter,
}: CellProps) {
  // Track if we recently handled a touch event to prevent mouse event double-firing
  const touchHandledRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Ignore mouse events if we just handled a touch event
    if (!interactive || touchHandledRef.current) {
      return;
    }
    e.preventDefault();
    // Start drag on mouse down (this handles both clicks and drags).
    // Right-click (button 2) or shift + left-click both mean "mark empty" —
    // right-dragging is awkward or impossible on many trackpads.
    onCellDragStart(row, col, e.button === 2 || e.shiftKey);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Prevent the context menu from appearing, but drag start already handled it
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (!interactive) return;
    // Continue drag when mouse enters this cell
    if (e.buttons > 0) {
      // Only if mouse button is pressed
      onCellDragEnter(row, col);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!interactive) return;
    e.preventDefault();
    // Set flag to prevent mouse events from firing
    touchHandledRef.current = true;
    // Reset flag after a short delay (mouse events fire ~300ms after touch on some browsers)
    setTimeout(() => {
      touchHandledRef.current = false;
    }, 500);
    // Start drag on touch
    onCellDragStart(row, col, false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!interactive) return;
    // Prevent page scrolling and pull-to-refresh while dragging
    e.preventDefault();

    // Find which cell the touch is over
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);

    if (element && element.getAttribute('role') === 'gridcell') {
      const cellRow = parseInt(element.getAttribute('data-row') || '0');
      const cellCol = parseInt(element.getAttribute('data-col') || '0');
      onCellDragEnter(cellRow, cellCol);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // Use click handler for keyboard accessibility
      onCellClick(row, col, false);
    }
  };

  // Use smaller cells for large puzzles on mobile to fit entire puzzle on screen
  const isLargePuzzle = gridWidth > 10 || gridHeight > 10;

  // Check if this cell is a mistake
  // - Filled when it should be empty
  // - Marked empty when it should be filled
  const isMistake =
    (state === CellState.Filled && !solutionValue) ||
    (state === CellState.MarkedEmpty && solutionValue);

  const getCellClasses = () => {
    // 15x15 uses ~22px cells, smaller puzzles use 40px
    const mobileSizeClass = isLargePuzzle ? 'w-[22px] h-[22px]' : 'w-10 h-10';

    const base = `${mobileSizeClass} sm:w-12 sm:h-12 border border-gray-400 relative flex items-center justify-center select-none touch-none ${
      interactive ? 'cursor-pointer' : 'cursor-default'
    }`;

    // Add thicker borders every 5 rows/columns for better readability (internal only, not edges)
    const gridLines = [];
    if ((col + 1) % 5 === 0 && col + 1 < gridWidth) {
      gridLines.push('border-r-2 border-r-gray-700');
    }
    if ((row + 1) % 5 === 0 && row + 1 < gridHeight) {
      gridLines.push('border-b-2 border-b-gray-700');
    }

    const gridLineClasses = gridLines.join(' ');

    // For filled cells, we'll use a child element for the fill, not background color
    // For other states, use background colors as before
    switch (state) {
      case CellState.Filled:
        return `${base} ${gridLineClasses} bg-white`;
      case CellState.MarkedEmpty:
        // Show red background for mistakes (marked empty but should be filled)
        if (isMistake) {
          return `${base} ${gridLineClasses} bg-red-100 ${interactive ? 'hover:bg-red-50' : ''}`;
        }
        return `${base} ${gridLineClasses} bg-white ${interactive ? 'hover:bg-gray-100' : ''}`;
      case CellState.Empty:
      default:
        return `${base} ${gridLineClasses} bg-white ${interactive ? 'hover:bg-gray-50' : ''}`;
    }
  };

  return (
    <div
      role="gridcell"
      tabIndex={-1}
      className={getCellClasses()}
      onContextMenu={handleContextMenu}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onKeyDown={handleKeyDown}
      data-row={row}
      data-col={col}
      aria-label={`Cell ${row + 1}, ${col + 1}`}
    >
      {state === CellState.Filled && (
        <div
          className={`absolute inset-[2px] transition-colors ${animateMarks ? 'animate-mark-in' : ''} ${
            isMistake
              ? `bg-red-600 ${interactive ? 'hover:bg-red-500' : ''}`
              : `bg-gray-800 ${interactive ? 'hover:bg-gray-700' : ''}`
          }`}
        />
      )}
      {state === CellState.MarkedEmpty && (
        <span
          className={`font-thin absolute ${animateMarks ? 'animate-mark-fade' : ''} ${
            isLargePuzzle ? 'text-[21px] sm:text-[46px]' : 'text-[38px] sm:text-[46px]'
          } ${isMistake ? 'text-red-600' : 'text-gray-800'}`}
          style={{
            top: '54%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            lineHeight: 1,
          }}
        >
          ×
        </span>
      )}
    </div>
  );
}
