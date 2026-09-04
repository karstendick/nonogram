import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Grid } from '../src/components/Grid';
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

describe('Grid - Cell State Constraints', () => {
  beforeEach(() => {
    // Reset and load puzzle
    const store = useGameStore.getState();
    store.loadPuzzle(createTestPuzzle());
  });

  it('should not allow marking empty a filled cell with right-click', async () => {
    const user = userEvent.setup();
    render(<Grid />);

    const cells = screen.getAllByRole('gridcell');
    const cell = cells[0];

    // Fill the cell
    await user.click(cell);

    // Verify it's filled
    let store = useGameStore.getState();
    expect(store.playerGrid[0][0]).toBe(CellState.Filled);

    // Try to mark it empty with context menu (right-click)
    await user.pointer({ keys: '[MouseRight]', target: cell });

    // Verify it's still filled (not changed to marked empty)
    store = useGameStore.getState();
    expect(store.playerGrid[0][0]).toBe(CellState.Filled);
  });

  it('should not allow filling a marked empty cell with left-click', async () => {
    const user = userEvent.setup();
    render(<Grid />);

    const cells = screen.getAllByRole('gridcell');
    const cell = cells[0];

    // Mark the cell as empty with context menu
    await user.pointer({ keys: '[MouseRight]', target: cell });

    // Verify it's marked empty
    let store = useGameStore.getState();
    expect(store.playerGrid[0][0]).toBe(CellState.MarkedEmpty);

    // Try to fill it with left-click
    await user.click(cell);

    // Verify it's still marked empty (not changed to filled)
    store = useGameStore.getState();
    expect(store.playerGrid[0][0]).toBe(CellState.MarkedEmpty);
  });

  it('should allow clearing filled cell and then marking it empty', async () => {
    const user = userEvent.setup();
    render(<Grid />);

    const cells = screen.getAllByRole('gridcell');
    const cell = cells[0];

    // Fill the cell
    await user.click(cell);
    let store = useGameStore.getState();
    expect(store.playerGrid[0][0]).toBe(CellState.Filled);

    // Clear it back to empty
    await user.click(cell);
    store = useGameStore.getState();
    expect(store.playerGrid[0][0]).toBe(CellState.Empty);

    // Now mark it as empty with context menu
    await user.pointer({ keys: '[MouseRight]', target: cell });
    store = useGameStore.getState();
    expect(store.playerGrid[0][0]).toBe(CellState.MarkedEmpty);
  });

  it('should allow clearing marked empty cell and then filling it', async () => {
    const user = userEvent.setup();
    render(<Grid />);

    const cells = screen.getAllByRole('gridcell');
    const cell = cells[0];

    // Mark the cell as empty with context menu
    await user.pointer({ keys: '[MouseRight]', target: cell });
    let store = useGameStore.getState();
    expect(store.playerGrid[0][0]).toBe(CellState.MarkedEmpty);

    // Clear it back to empty with context menu again
    await user.pointer({ keys: '[MouseRight]', target: cell });
    store = useGameStore.getState();
    expect(store.playerGrid[0][0]).toBe(CellState.Empty);

    // Now fill it
    await user.click(cell);
    store = useGameStore.getState();
    expect(store.playerGrid[0][0]).toBe(CellState.Filled);
  });

  it('should not increment move count when clicking on wrong state', async () => {
    const user = userEvent.setup();
    render(<Grid />);

    const cells = screen.getAllByRole('gridcell');
    const cell = cells[0];

    // Fill the cell
    await user.click(cell);
    let store = useGameStore.getState();
    const movesAfterFill = store.moves;
    expect(store.playerGrid[0][0]).toBe(CellState.Filled);

    // Try to mark it empty with context menu (should do nothing)
    await user.pointer({ keys: '[MouseRight]', target: cell });

    // Verify moves didn't increment
    store = useGameStore.getState();
    expect(store.moves).toBe(movesAfterFill);
    expect(store.playerGrid[0][0]).toBe(CellState.Filled);
  });
});

describe('Grid - Replay Rendering', () => {
  beforeEach(() => {
    useGameStore.getState().loadPuzzle(createTestPuzzle());
  });

  it('draws the supplied grid instead of the player grid', () => {
    const displayGrid = [
      [CellState.Filled, CellState.Empty, CellState.MarkedEmpty],
      [CellState.Empty, CellState.Empty, CellState.Empty],
      [CellState.Empty, CellState.Empty, CellState.Empty],
    ];

    render(<Grid displayGrid={displayGrid} interactive={false} />);

    const cells = screen.getAllByRole('gridcell');
    expect(cells[0].querySelector('div')).not.toBeNull(); // filled
    expect(cells[2].textContent).toBe('×'); // marked empty
    expect(useGameStore.getState().playerGrid[0][0]).toBe(CellState.Empty);
  });

  it('ignores clicks while not interactive', async () => {
    const user = userEvent.setup();
    const displayGrid = [
      [CellState.Empty, CellState.Empty, CellState.Empty],
      [CellState.Empty, CellState.Empty, CellState.Empty],
      [CellState.Empty, CellState.Empty, CellState.Empty],
    ];

    render(<Grid displayGrid={displayGrid} interactive={false} />);

    await user.click(screen.getAllByRole('gridcell')[0]);

    expect(useGameStore.getState().playerGrid[0][0]).toBe(CellState.Empty);
    expect(useGameStore.getState().moves).toBe(0);
  });
});

// Right-dragging is awkward or impossible on many trackpads, so shift + left is
// the same gesture by another route.
describe('Grid - Shift-click to mark empty', () => {
  beforeEach(() => {
    const store = useGameStore.getState();
    store.loadPuzzle(createTestPuzzle());
  });

  it('should mark a cell empty on shift + left-click', async () => {
    const user = userEvent.setup();
    render(<Grid />);

    const cell = screen.getAllByRole('gridcell')[0];

    await user.keyboard('{Shift>}');
    await user.click(cell);
    await user.keyboard('{/Shift}');

    expect(useGameStore.getState().playerGrid[0][0]).toBe(CellState.MarkedEmpty);
  });

  it('should clear a marked empty cell on shift + left-click', async () => {
    const user = userEvent.setup();
    render(<Grid />);

    const cell = screen.getAllByRole('gridcell')[0];

    await user.keyboard('{Shift>}');
    await user.click(cell);
    expect(useGameStore.getState().playerGrid[0][0]).toBe(CellState.MarkedEmpty);

    await user.click(cell);
    await user.keyboard('{/Shift}');

    expect(useGameStore.getState().playerGrid[0][0]).toBe(CellState.Empty);
  });

  it('should not allow marking empty a filled cell with shift + left-click', async () => {
    const user = userEvent.setup();
    render(<Grid />);

    const cell = screen.getAllByRole('gridcell')[0];

    await user.click(cell);
    expect(useGameStore.getState().playerGrid[0][0]).toBe(CellState.Filled);

    await user.keyboard('{Shift>}');
    await user.click(cell);
    await user.keyboard('{/Shift}');

    // Same refusal as a right-click on a filled cell
    expect(useGameStore.getState().playerGrid[0][0]).toBe(CellState.Filled);
  });

  it('should mark a run empty on shift + left-drag', async () => {
    const user = userEvent.setup();
    render(<Grid />);

    const cells = screen.getAllByRole('gridcell');

    await user.keyboard('{Shift>}');
    await user.pointer([
      { keys: '[MouseLeft>]', target: cells[6] }, // row 2, col 0
      { target: cells[7] }, // row 2, col 1
      { keys: '[/MouseLeft]' },
    ]);
    await user.keyboard('{/Shift}');

    const { playerGrid } = useGameStore.getState();
    expect(playerGrid[2][0]).toBe(CellState.MarkedEmpty);
    expect(playerGrid[2][1]).toBe(CellState.MarkedEmpty);
  });

  it('should still fill on a plain left-click', async () => {
    const user = userEvent.setup();
    render(<Grid />);

    await user.click(screen.getAllByRole('gridcell')[0]);

    expect(useGameStore.getState().playerGrid[0][0]).toBe(CellState.Filled);
  });
});
