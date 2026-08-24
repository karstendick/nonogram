import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameBoard } from '../src/components/GameBoard';
import { useGameStore } from '../src/store/gameStore';
import { CellState } from '../src/types';
import type { Puzzle } from '../src/types';

// Helper to create a test puzzle
const createTestPuzzle = (): Puzzle => ({
  id: 'test',
  title: 'Test',
  difficulty: 'easy',
  width: 3,
  height: 3,
  solution: [
    [true, true, false],
    [true, false, false],
    [false, false, false],
  ],
  rowClues: [[2], [1], [0]],
  columnClues: [[2], [1], [0]],
});

describe('GameBoard - Clue Clicking', () => {
  beforeEach(() => {
    // Reset and load puzzle
    const store = useGameStore.getState();
    store.loadPuzzle(createTestPuzzle());
  });

  it('should mark remaining empty cells when clicking a completed row clue', async () => {
    const user = userEvent.setup();
    render(<GameBoard />);

    // Complete the first row (fill cells [0,0] and [0,1])
    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[0]); // [0,0]
    await user.click(cells[1]); // [0,1]

    // Get the store state
    const store = useGameStore.getState();

    // Verify row is complete
    expect(store.playerGrid[0][0]).toBe(CellState.Filled);
    expect(store.playerGrid[0][1]).toBe(CellState.Filled);
    expect(store.playerGrid[0][2]).toBe(CellState.Empty);

    // Find completed clue buttons (clues become buttons when complete)
    const clueButtons = screen.getAllByRole('button');
    // Filter to find the row clue with text "2"
    const rowClueButton = clueButtons.find((btn) => btn.textContent === '2');
    expect(rowClueButton).toBeDefined();

    await user.click(rowClueButton!);

    // Verify the empty cell was marked
    const updatedStore = useGameStore.getState();
    expect(updatedStore.playerGrid[0][2]).toBe(CellState.MarkedEmpty);
  });

  it('should mark remaining empty cells when clicking a completed column clue', async () => {
    const user = userEvent.setup();
    render(<GameBoard />);

    // Complete the first column (fill cells [0,0] and [1,0])
    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[0]); // [0,0]
    await user.click(cells[3]); // [1,0]

    // Get the store state
    const store = useGameStore.getState();

    // Verify column is complete
    expect(store.playerGrid[0][0]).toBe(CellState.Filled);
    expect(store.playerGrid[1][0]).toBe(CellState.Filled);
    expect(store.playerGrid[2][0]).toBe(CellState.Empty);

    // Find completed clue button (only column 0 is complete, row 0 is not)
    const clueButtons = screen.getAllByRole('button');
    // Only the column "2" clue should be a button
    const columnClueButton = clueButtons.find((btn) => btn.textContent === '2');
    expect(columnClueButton).toBeDefined();

    await user.click(columnClueButton!);

    // Verify the empty cell was marked
    const updatedStore = useGameStore.getState();
    expect(updatedStore.playerGrid[2][0]).toBe(CellState.MarkedEmpty);
  });

  it('should do nothing when clicking an incomplete row clue', async () => {
    const user = userEvent.setup();
    render(<GameBoard />);

    // Partially fill the first row (only [0,0])
    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[0]); // [0,0]

    const initialStore = useGameStore.getState();
    const initialMoves = initialStore.moves;

    // Click the incomplete row clue
    const rowClue = screen.getAllByText('2')[0];
    await user.click(rowClue);

    // Verify nothing changed
    const updatedStore = useGameStore.getState();
    expect(updatedStore.moves).toBe(initialMoves); // No new move
    expect(updatedStore.playerGrid[0][2]).toBe(CellState.Empty); // Still empty
  });

  it('should do nothing when clicking an incomplete column clue', async () => {
    const user = userEvent.setup();
    render(<GameBoard />);

    // Partially fill the first column (only [0,0])
    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[0]); // [0,0]

    const initialStore = useGameStore.getState();
    const initialMoves = initialStore.moves;

    // Click the incomplete column clue
    const columnClue = screen.getAllByText('2')[1];
    await user.click(columnClue);

    // Verify nothing changed
    const updatedStore = useGameStore.getState();
    expect(updatedStore.moves).toBe(initialMoves); // No new move
    expect(updatedStore.playerGrid[2][0]).toBe(CellState.Empty); // Still empty
  });

  it('should only mark cells that are Empty, not already MarkedEmpty', async () => {
    const user = userEvent.setup();
    render(<GameBoard />);

    // Complete the first row and pre-mark one cell
    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[0]); // [0,0] - Fill
    await user.click(cells[1]); // [0,1] - Fill

    // Manually mark [0,2] as MarkedEmpty before clicking the clue
    const store = useGameStore.getState();
    store.setCellState(0, 2, CellState.MarkedEmpty);

    const movesBeforeClueClick = useGameStore.getState().moves;

    // Click the completed row clue
    const rowClue = screen.getAllByText('2')[0];
    await user.click(rowClue);

    // Since all cells are already filled or marked, moves should not increase
    const updatedStore = useGameStore.getState();
    expect(updatedStore.moves).toBe(movesBeforeClueClick);
  });

  it('should support keyboard interaction on completed clues', async () => {
    const user = userEvent.setup();
    render(<GameBoard />);

    // Complete the first row
    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[0]); // [0,0]
    await user.click(cells[1]); // [0,1]

    // Find the completed row clue button and press Enter
    const clueButtons = screen.getAllByRole('button');
    const rowClueButton = clueButtons.find((btn) => btn.textContent === '2');
    expect(rowClueButton).toBeDefined();

    rowClueButton!.focus();
    await user.keyboard('{Enter}');

    // Verify the empty cell was marked
    const updatedStore = useGameStore.getState();
    expect(updatedStore.playerGrid[0][2]).toBe(CellState.MarkedEmpty);
  });
});

describe('GameBoard - Replay Rendering', () => {
  beforeEach(() => {
    useGameStore.getState().loadPuzzle(createTestPuzzle());
  });

  it('derives clue completion from the supplied grid', () => {
    // Row 0 of the solution is complete in this display grid, but the store's
    // grid is still empty
    const displayGrid = [
      [CellState.Filled, CellState.Filled, CellState.Empty],
      [CellState.Empty, CellState.Empty, CellState.Empty],
      [CellState.Empty, CellState.Empty, CellState.Empty],
    ];

    // Baseline: the all-zero row and column clues already read as complete
    const { rerender } = render(<GameBoard />);
    const baseline = screen.queryAllByRole('button').length;

    // Filling row 0 completes that row's clue and, with it, column 1's
    rerender(<GameBoard displayGrid={displayGrid} />);
    expect(screen.queryAllByRole('button').length).toBe(baseline + 2);
  });

  it('does not treat clues as buttons while not interactive', () => {
    const displayGrid = [
      [CellState.Filled, CellState.Filled, CellState.Empty],
      [CellState.Filled, CellState.Empty, CellState.Empty],
      [CellState.Empty, CellState.Empty, CellState.Empty],
    ];

    render(<GameBoard displayGrid={displayGrid} interactive={false} />);

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(useGameStore.getState().playerGrid[2][0]).toBe(CellState.Empty);
  });
});
