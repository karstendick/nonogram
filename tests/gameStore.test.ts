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
});
