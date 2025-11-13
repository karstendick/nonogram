import { create } from 'zustand';
import { CellState, InteractionMode, type Puzzle } from '../types';

interface GameStore {
  // Current puzzle state
  currentPuzzle: Puzzle | null;
  playerGrid: CellState[][];
  currentMode: InteractionMode;
  moves: number;
  isComplete: boolean;

  // History for undo/redo
  history: CellState[][][];
  historyIndex: number;

  // Actions
  loadPuzzle: (puzzle: Puzzle) => void;
  setCellState: (row: number, col: number, state: CellState) => void;
  setMode: (mode: InteractionMode) => void;
  resetPuzzle: () => void;
  checkSolution: () => boolean;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  currentPuzzle: null,
  playerGrid: [],
  currentMode: InteractionMode.Fill,
  moves: 0,
  isComplete: false,
  history: [],
  historyIndex: -1,

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
      history: [emptyGrid],
      historyIndex: 0,
    });
  },

  // Set cell state and add to history
  setCellState: (row: number, col: number, state: CellState) => {
    const { playerGrid, history, historyIndex, currentPuzzle } = get();

    if (!currentPuzzle) return;

    // Create new grid with updated cell
    const newGrid = playerGrid.map((r, i) =>
      i === row ? r.map((c, j) => (j === col ? state : c)) : [...r]
    );

    // Truncate history after current index and add new state
    const newHistory = [...history.slice(0, historyIndex + 1), newGrid];

    set({
      playerGrid: newGrid,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      moves: get().moves + 1,
    });
  },

  // Set interaction mode (for mobile)
  setMode: (mode: InteractionMode) => {
    set({ currentMode: mode });
  },

  // Reset puzzle to empty state
  resetPuzzle: () => {
    const { currentPuzzle } = get();
    if (!currentPuzzle) return;

    const emptyGrid: CellState[][] = Array.from({ length: currentPuzzle.height }, () =>
      Array.from({ length: currentPuzzle.width }, () => CellState.Empty)
    );

    set({
      playerGrid: emptyGrid,
      moves: 0,
      isComplete: false,
      history: [emptyGrid],
      historyIndex: 0,
    });
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

  // Undo last move
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set({
        playerGrid: history[newIndex],
        historyIndex: newIndex,
      });
    }
  },

  // Redo last undone move
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      set({
        playerGrid: history[newIndex],
        historyIndex: newIndex,
      });
    }
  },

  // Check if undo is available
  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },

  // Check if redo is available
  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },
}));
