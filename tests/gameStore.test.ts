import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/store/gameStore';
import { CellState } from '../src/types';
import type { Puzzle } from '../src/types';

// Helper to create a simple test puzzle
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

describe('GameStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useGameStore.getState();
    store.loadPuzzle(createTestPuzzle());
  });

  describe('markMultipleCells', () => {
    it('should update multiple cells at once', () => {
      const store = useGameStore.getState();

      store.markMultipleCells([
        { row: 0, col: 0, state: CellState.Filled },
        { row: 0, col: 1, state: CellState.Filled },
        { row: 1, col: 0, state: CellState.Filled },
      ]);

      const { playerGrid } = useGameStore.getState();
      expect(playerGrid[0][0]).toBe(CellState.Filled);
      expect(playerGrid[0][1]).toBe(CellState.Filled);
      expect(playerGrid[1][0]).toBe(CellState.Filled);
    });

    it('should increment moves by 1 regardless of number of cells', () => {
      const store = useGameStore.getState();
      const initialMoves = store.moves;

      store.markMultipleCells([
        { row: 0, col: 0, state: CellState.Filled },
        { row: 0, col: 1, state: CellState.Filled },
        { row: 1, col: 0, state: CellState.Filled },
      ]);

      const { moves } = useGameStore.getState();
      expect(moves).toBe(initialMoves + 1);
    });

    it('should do nothing if cells array is empty', () => {
      const store = useGameStore.getState();
      const initialMoves = store.moves;

      store.markMultipleCells([]);

      const { moves } = useGameStore.getState();
      expect(moves).toBe(initialMoves);
    });
  });

  describe('auto-check solution', () => {
    it('should set isComplete to true when puzzle is solved via setCellState', () => {
      const store = useGameStore.getState();

      // Fill in the solution
      store.setCellState(0, 0, CellState.Filled);
      store.setCellState(0, 1, CellState.Filled);
      store.setCellState(1, 0, CellState.Filled);

      const { isComplete } = useGameStore.getState();
      expect(isComplete).toBe(true);
    });

    it('should set isComplete to true when puzzle is solved via markMultipleCells', () => {
      const store = useGameStore.getState();

      // Fill in the solution all at once
      store.markMultipleCells([
        { row: 0, col: 0, state: CellState.Filled },
        { row: 0, col: 1, state: CellState.Filled },
        { row: 1, col: 0, state: CellState.Filled },
      ]);

      const { isComplete } = useGameStore.getState();
      expect(isComplete).toBe(true);
    });

    it('should remain false when puzzle is not solved', () => {
      const store = useGameStore.getState();

      // Fill in incorrect cells
      store.setCellState(0, 0, CellState.Filled);
      store.setCellState(0, 2, CellState.Filled); // Wrong cell

      const { isComplete } = useGameStore.getState();
      expect(isComplete).toBe(false);
    });
  });

  describe('checkSolution', () => {
    it('should return true for a correct solution', () => {
      const store = useGameStore.getState();

      // Fill in the correct solution
      store.setCellState(0, 0, CellState.Filled);
      store.setCellState(0, 1, CellState.Filled);
      store.setCellState(1, 0, CellState.Filled);

      const result = store.checkSolution();
      expect(result).toBe(true);
    });

    it('should return false when filled cells are missing', () => {
      const store = useGameStore.getState();

      // Only fill part of the solution
      store.setCellState(0, 0, CellState.Filled);

      const result = store.checkSolution();
      expect(result).toBe(false);
    });

    it('should return false when wrong cells are filled', () => {
      const store = useGameStore.getState();

      // Fill wrong cells
      store.setCellState(0, 2, CellState.Filled); // Should be empty

      const result = store.checkSolution();
      expect(result).toBe(false);
    });

    it('should ignore MarkedEmpty cells in empty positions', () => {
      const store = useGameStore.getState();

      // Fill correct solution and mark empties
      store.setCellState(0, 0, CellState.Filled);
      store.setCellState(0, 1, CellState.Filled);
      store.setCellState(1, 0, CellState.Filled);
      store.setCellState(0, 2, CellState.MarkedEmpty);
      store.setCellState(1, 1, CellState.MarkedEmpty);

      const result = store.checkSolution();
      expect(result).toBe(true);
    });
  });

  describe('drag interaction', () => {
    describe('startDrag', () => {
      it('should start a drag on a cell with fill action', () => {
        const store = useGameStore.getState();

        store.startDrag(0, 0, CellState.Filled);

        const { isDragging, dragStartRow, dragStartCol, dragAction } = useGameStore.getState();
        expect(isDragging).toBe(true);
        expect(dragStartRow).toBe(0);
        expect(dragStartCol).toBe(0);
        expect(dragAction).toBe(CellState.Filled);
      });

      it('should start a drag on a cell with mark empty action', () => {
        const store = useGameStore.getState();

        store.startDrag(1, 2, CellState.MarkedEmpty);

        const { isDragging, dragStartRow, dragStartCol, dragAction } = useGameStore.getState();
        expect(isDragging).toBe(true);
        expect(dragStartRow).toBe(1);
        expect(dragStartCol).toBe(2);
        expect(dragAction).toBe(CellState.MarkedEmpty);
      });

      it('should apply the action to the starting cell', () => {
        const store = useGameStore.getState();

        store.startDrag(0, 0, CellState.Filled);

        const { playerGrid } = useGameStore.getState();
        expect(playerGrid[0][0]).toBe(CellState.Filled);
      });
    });

    describe('continueDrag', () => {
      it('should apply drag action to cells in the same row', () => {
        const store = useGameStore.getState();

        // Start drag at (0, 0)
        store.startDrag(0, 0, CellState.Filled);

        // Continue drag to (0, 1) and (0, 2) - same row
        store.continueDrag(0, 1);
        store.continueDrag(0, 2);

        const { playerGrid } = useGameStore.getState();
        expect(playerGrid[0][0]).toBe(CellState.Filled);
        expect(playerGrid[0][1]).toBe(CellState.Filled);
        expect(playerGrid[0][2]).toBe(CellState.Filled);
      });

      it('should apply drag action to cells in the same column', () => {
        const store = useGameStore.getState();

        // Start drag at (0, 0)
        store.startDrag(0, 0, CellState.Filled);

        // Continue drag to (1, 0) and (2, 0) - same column
        store.continueDrag(1, 0);
        store.continueDrag(2, 0);

        const { playerGrid } = useGameStore.getState();
        expect(playerGrid[0][0]).toBe(CellState.Filled);
        expect(playerGrid[1][0]).toBe(CellState.Filled);
        expect(playerGrid[2][0]).toBe(CellState.Filled);
      });

      it('should not apply drag to a cell in a different row and column', () => {
        const store = useGameStore.getState();

        // Start drag at (0, 0)
        store.startDrag(0, 0, CellState.Filled);

        // Try to drag to (1, 1) - different row AND column
        store.continueDrag(1, 1);

        const { playerGrid } = useGameStore.getState();
        expect(playerGrid[0][0]).toBe(CellState.Filled);
        expect(playerGrid[1][1]).toBe(CellState.Empty); // Should not be filled
      });

      it('should lock to row axis when first drag move is horizontal', () => {
        const store = useGameStore.getState();

        // Start drag at (0, 0)
        store.startDrag(0, 0, CellState.Filled);

        // First move is horizontal (to 0, 1)
        store.continueDrag(0, 1);

        // Try to move vertically (to 1, 1)
        store.continueDrag(1, 1);

        const { playerGrid } = useGameStore.getState();
        expect(playerGrid[0][0]).toBe(CellState.Filled);
        expect(playerGrid[0][1]).toBe(CellState.Filled);
        expect(playerGrid[1][1]).toBe(CellState.Empty); // Should be rejected
      });

      it('should lock to column axis when first drag move is vertical', () => {
        const store = useGameStore.getState();

        // Start drag at (0, 0)
        store.startDrag(0, 0, CellState.Filled);

        // First move is vertical (to 1, 0)
        store.continueDrag(1, 0);

        // Try to move horizontally (to 1, 1)
        store.continueDrag(1, 1);

        const { playerGrid } = useGameStore.getState();
        expect(playerGrid[0][0]).toBe(CellState.Filled);
        expect(playerGrid[1][0]).toBe(CellState.Filled);
        expect(playerGrid[1][1]).toBe(CellState.Empty); // Should be rejected
      });

      it('should not mark a cell twice during the same drag', () => {
        const store = useGameStore.getState();

        // Start drag at (0, 0)
        store.startDrag(0, 0, CellState.Filled);

        // Continue to (0, 1)
        store.continueDrag(0, 1);
        expect(useGameStore.getState().playerGrid[0][1]).toBe(CellState.Filled);

        // Go back to (0, 0) - should not toggle it back to empty
        store.continueDrag(0, 0);
        expect(useGameStore.getState().playerGrid[0][0]).toBe(CellState.Filled);
      });

      it('should respect cell state constraints - cannot fill a MarkedEmpty cell', () => {
        const store = useGameStore.getState();

        // Mark (0, 1) as empty first
        store.setCellState(0, 1, CellState.MarkedEmpty);

        // Start drag at (0, 0) with Fill action
        store.startDrag(0, 0, CellState.Filled);

        // Try to drag to (0, 1) which is marked empty
        store.continueDrag(0, 1);

        const { playerGrid } = useGameStore.getState();
        expect(playerGrid[0][1]).toBe(CellState.MarkedEmpty); // Should remain marked empty
      });

      it('should respect cell state constraints - cannot mark empty a Filled cell', () => {
        const store = useGameStore.getState();

        // Fill (0, 1) first
        store.setCellState(0, 1, CellState.Filled);

        // Start drag at (0, 0) with MarkEmpty action
        store.startDrag(0, 0, CellState.MarkedEmpty);

        // Try to drag to (0, 1) which is filled
        store.continueDrag(0, 1);

        const { playerGrid } = useGameStore.getState();
        expect(playerGrid[0][1]).toBe(CellState.Filled); // Should remain filled
      });

      it('should clear filled cells when dragging from a filled cell', () => {
        const store = useGameStore.getState();

        // Fill multiple cells first
        store.setCellState(0, 0, CellState.Filled);
        store.setCellState(0, 1, CellState.Filled);
        store.setCellState(0, 2, CellState.Filled);

        // Verify cells are filled
        expect(useGameStore.getState().playerGrid[0][0]).toBe(CellState.Filled);
        expect(useGameStore.getState().playerGrid[0][1]).toBe(CellState.Filled);

        // Start drag on filled cell (0, 0) with Empty action
        store.startDrag(0, 0, CellState.Empty);

        // Check drag state is set correctly
        const stateAfterStart = useGameStore.getState();
        expect(stateAfterStart.isDragging).toBe(true);
        expect(stateAfterStart.dragAction).toBe(CellState.Empty);
        expect(stateAfterStart.playerGrid[0][0]).toBe(CellState.Empty);

        // Drag to clear other filled cells
        store.continueDrag(0, 1);
        store.continueDrag(0, 2);

        const { playerGrid } = useGameStore.getState();
        expect(playerGrid[0][0]).toBe(CellState.Empty);
        expect(playerGrid[0][1]).toBe(CellState.Empty);
        expect(playerGrid[0][2]).toBe(CellState.Empty);
      });

      it('should clear marked empty cells when dragging from a marked empty cell', () => {
        const store = useGameStore.getState();

        // Mark multiple cells empty first
        store.setCellState(0, 0, CellState.MarkedEmpty);
        store.setCellState(0, 1, CellState.MarkedEmpty);
        store.setCellState(0, 2, CellState.MarkedEmpty);

        // Start drag on marked empty cell (0, 0) with Empty action
        store.startDrag(0, 0, CellState.Empty);

        // Drag to clear other marked cells
        store.continueDrag(0, 1);
        store.continueDrag(0, 2);

        const { playerGrid } = useGameStore.getState();
        expect(playerGrid[0][0]).toBe(CellState.Empty);
        expect(playerGrid[0][1]).toBe(CellState.Empty);
        expect(playerGrid[0][2]).toBe(CellState.Empty);
      });
    });

    describe('endDrag', () => {
      it('should end the drag and reset drag state', () => {
        const store = useGameStore.getState();

        store.startDrag(0, 0, CellState.Filled);
        store.continueDrag(0, 1);

        const { isDragging: isDraggingBefore } = useGameStore.getState();
        expect(isDraggingBefore).toBe(true);

        store.endDrag();

        const { isDragging, dragStartRow, dragStartCol, dragAction } = useGameStore.getState();
        expect(isDragging).toBe(false);
        expect(dragStartRow).toBe(null);
        expect(dragStartCol).toBe(null);
        expect(dragAction).toBe(null);
      });

      it('should increment moves by 1 for the entire drag operation', () => {
        const store = useGameStore.getState();
        const initialMoves = store.moves;

        store.startDrag(0, 0, CellState.Filled);
        store.continueDrag(0, 1);
        store.continueDrag(0, 2);
        store.endDrag();

        const { moves } = useGameStore.getState();
        expect(moves).toBe(initialMoves + 1);
      });

      it('should keep the cells marked during drag', () => {
        const store = useGameStore.getState();

        store.startDrag(0, 0, CellState.Filled);
        store.continueDrag(0, 1);
        store.continueDrag(0, 2);
        store.endDrag();

        const { playerGrid } = useGameStore.getState();
        expect(playerGrid[0][0]).toBe(CellState.Filled);
        expect(playerGrid[0][1]).toBe(CellState.Filled);
        expect(playerGrid[0][2]).toBe(CellState.Filled);
      });
    });
  });
});
