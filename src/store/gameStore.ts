import { create } from 'zustand';
import { CellState, InteractionMode, type Puzzle } from '../types';

interface GameStore {
  // Current puzzle state
  currentPuzzle: Puzzle | null;
  playerGrid: CellState[][];
  currentMode: InteractionMode;
  moves: number;
  isComplete: boolean;

  // Actions
  loadPuzzle: (puzzle: Puzzle) => void;
  setCellState: (row: number, col: number, state: CellState) => void;
  markMultipleCells: (cells: Array<{ row: number; col: number; state: CellState }>) => void;
  setMode: (mode: InteractionMode) => void;
  checkSolution: () => boolean;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  currentPuzzle: null,
  playerGrid: [],
  currentMode: InteractionMode.Fill,
  moves: 0,
  isComplete: false,

  // Load a new puzzle
  loadPuzzle: (puzzle: Puzzle) => {
    const emptyGrid: CellState[][] = Array.from({ length: puzzle.height }, () =>
      Array.from({ length: puzzle.width }, () => CellState.Empty)
    );

    set({
      currentPuzzle: puzzle,
      playerGrid: emptyGrid,
      moves: 0,
      isComplete: false,
    });
  },

  // Set cell state
  setCellState: (row: number, col: number, state: CellState) => {
    const { playerGrid, currentPuzzle } = get();

    if (!currentPuzzle) return;

    // Create new grid with updated cell
    const newGrid = playerGrid.map((r, i) =>
      i === row ? r.map((c, j) => (j === col ? state : c)) : [...r]
    );

    set({
      playerGrid: newGrid,
      moves: get().moves + 1,
    });

    // Check if puzzle is complete after this move
    get().checkSolution();
  },

  // Mark multiple cells at once
  markMultipleCells: (cells: Array<{ row: number; col: number; state: CellState }>) => {
    const { playerGrid, currentPuzzle } = get();

    if (!currentPuzzle || cells.length === 0) return;

    // Create new grid with all updated cells
    const newGrid = playerGrid.map((row) => [...row]);
    cells.forEach(({ row, col, state }) => {
      newGrid[row][col] = state;
    });

    set({
      playerGrid: newGrid,
      moves: get().moves + 1,
    });

    // Check if puzzle is complete after this move
    get().checkSolution();
  },

  // Set interaction mode (for mobile)
  setMode: (mode: InteractionMode) => {
    set({ currentMode: mode });
  },

  // Check if solution is correct
  checkSolution: () => {
    const { playerGrid, currentPuzzle } = get();
    if (!currentPuzzle) return false;

    const { solution } = currentPuzzle;
    let isCorrect = true;

    for (let row = 0; row < currentPuzzle.height; row++) {
      for (let col = 0; col < currentPuzzle.width; col++) {
        const playerCell = playerGrid[row][col];
        const solutionCell = solution[row][col];

        if (solutionCell && playerCell !== CellState.Filled) {
          isCorrect = false;
          break;
        }
        if (!solutionCell && playerCell === CellState.Filled) {
          isCorrect = false;
          break;
        }
      }
      if (!isCorrect) break;
    }

    set({ isComplete: isCorrect });
    return isCorrect;
  },
}));
