import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_LEVEL_ID } from '../logic/generation/levels';
import { CellState, InteractionMode, type Puzzle } from '../types';
import { encodeMark } from '../logic/replay';

// Append a mark to the replay log. Erases contribute nothing to a replay, so
// only fills and X-marks are recorded.
const recordMark = (
  markLog: number[],
  width: number,
  row: number,
  col: number,
  state: CellState
): number[] =>
  state === CellState.Empty ? markLog : [...markLog, encodeMark(row, col, width, state)];

interface GameStore {
  // Current puzzle state
  currentPuzzle: Puzzle | null;
  playerGrid: CellState[][];
  currentMode: InteractionMode;
  moves: number;
  isComplete: boolean;
  // Append-only log of every fill and X-mark, in the order the player made them
  markLog: number[];
  /**
   * The difficulty level last played. Persisted so the app can start generating
   * the next puzzle before being asked: players pick the same level over and
   * over, which makes it a very good guess, and a wrong one costs only some
   * background work.
   */
  lastLevelId: number;

  // Drag state
  isDragging: boolean;
  dragStartRow: number | null;
  dragStartCol: number | null;
  dragAction: CellState | null;
  dragAxis: 'row' | 'column' | null;
  draggedCells: Set<string>;

  // Actions
  loadPuzzle: (puzzle: Puzzle) => void;
  setCellState: (row: number, col: number, state: CellState) => void;
  markMultipleCells: (cells: Array<{ row: number; col: number; state: CellState }>) => void;
  setMode: (mode: InteractionMode) => void;
  checkSolution: () => boolean;

  setLastLevelId: (levelId: number) => void;

  // Drag actions
  startDrag: (row: number, col: number, action: CellState) => void;
  continueDrag: (row: number, col: number) => void;
  endDrag: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentPuzzle: null,
      playerGrid: [],
      currentMode: InteractionMode.Fill,
      moves: 0,
      isComplete: false,
      markLog: [],
      lastLevelId: DEFAULT_LEVEL_ID,

      // Drag state
      isDragging: false,
      dragStartRow: null,
      dragStartCol: null,
      dragAction: null,
      dragAxis: null,
      draggedCells: new Set<string>(),

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
          markLog: [],
          // Reset drag state when loading a new puzzle
          isDragging: false,
          dragStartRow: null,
          dragStartCol: null,
          dragAction: null,
          dragAxis: null,
          draggedCells: new Set<string>(),
        });
      },

      // Set cell state
      setCellState: (row: number, col: number, state: CellState) => {
        const { playerGrid, currentPuzzle, markLog } = get();

        if (!currentPuzzle) return;

        // Create new grid with updated cell
        const newGrid = playerGrid.map((r, i) =>
          i === row ? r.map((c, j) => (j === col ? state : c)) : [...r]
        );

        set({
          playerGrid: newGrid,
          moves: get().moves + 1,
          markLog: recordMark(markLog, currentPuzzle.width, row, col, state),
        });

        // Check if puzzle is complete after this move
        get().checkSolution();
      },

      // Mark multiple cells at once
      markMultipleCells: (cells: Array<{ row: number; col: number; state: CellState }>) => {
        const { playerGrid, currentPuzzle, markLog } = get();

        if (!currentPuzzle || cells.length === 0) return;

        // Create new grid with all updated cells
        const newGrid = playerGrid.map((row) => [...row]);
        let newMarkLog = markLog;
        cells.forEach(({ row, col, state }) => {
          newGrid[row][col] = state;
          newMarkLog = recordMark(newMarkLog, currentPuzzle.width, row, col, state);
        });

        set({
          playerGrid: newGrid,
          moves: get().moves + 1,
          markLog: newMarkLog,
        });

        // Check if puzzle is complete after this move
        get().checkSolution();
      },

      // Set interaction mode (for mobile)
      setLastLevelId: (levelId: number) => {
        set({ lastLevelId: levelId });
      },

      setMode: (mode: InteractionMode) => {
        set({ currentMode: mode });
      },

      // Check if solution is correct
      checkSolution: () => {
        const { playerGrid, currentPuzzle, isComplete, markLog } = get();
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

        // Winning only requires the picture to be right, so every cell the player
        // never bothered to X is still Empty. Fill those in as the puzzle is won:
        // the cells are known empty at that point, and leaving them blank puts
        // holes in the finished board and in the replay built from it.
        //
        // Only on the transition into complete, so a puzzle restored from storage
        // already finished is left as it was, and re-checking appends nothing.
        if (isCorrect && !isComplete) {
          const completedGrid = playerGrid.map((r) => [...r]);
          // Reading order, so the replay ends on a sweep across and down the board
          const autoMarks: number[] = [];

          for (let row = 0; row < currentPuzzle.height; row++) {
            for (let col = 0; col < currentPuzzle.width; col++) {
              if (completedGrid[row][col] !== CellState.Empty) continue;
              completedGrid[row][col] = CellState.MarkedEmpty;
              autoMarks.push(encodeMark(row, col, currentPuzzle.width, CellState.MarkedEmpty));
            }
          }

          // Not moves: the completion stat weighs player moves against the
          // deductions the puzzle needed, and these are the machine's, not theirs.
          set({
            isComplete: true,
            playerGrid: completedGrid,
            markLog: autoMarks.length > 0 ? [...markLog, ...autoMarks] : markLog,
          });
          return true;
        }

        set({ isComplete: isCorrect });
        return isCorrect;
      },

      // Start a drag operation
      startDrag: (row: number, col: number, action: CellState) => {
        const { playerGrid, currentPuzzle, markLog } = get();
        if (!currentPuzzle) return;

        // Check if we can apply this action to the starting cell
        const currentState = playerGrid[row][col];

        // Respect cell state constraints
        if (action === CellState.Filled && currentState === CellState.MarkedEmpty) {
          return; // Cannot fill a marked empty cell
        }
        if (action === CellState.MarkedEmpty && currentState === CellState.Filled) {
          return; // Cannot mark empty a filled cell
        }

        // Create new grid with the starting cell updated
        const newGrid = playerGrid.map((r, i) =>
          i === row ? r.map((c, j) => (j === col ? action : c)) : [...r]
        );

        // Initialize drag state
        const draggedCells = new Set<string>();
        draggedCells.add(`${row},${col}`);

        set({
          playerGrid: newGrid,
          markLog: recordMark(markLog, currentPuzzle.width, row, col, action),
          isDragging: true,
          dragStartRow: row,
          dragStartCol: col,
          dragAction: action,
          dragAxis: null, // Will be determined on first move
          draggedCells,
        });
      },

      // Continue dragging to a new cell
      continueDrag: (row: number, col: number) => {
        const {
          isDragging,
          dragStartRow,
          dragStartCol,
          dragAction,
          dragAxis,
          draggedCells,
          playerGrid,
          currentPuzzle,
          markLog,
        } = get();

        if (
          !isDragging ||
          dragStartRow === null ||
          dragStartCol === null ||
          dragAction === null ||
          !currentPuzzle
        ) {
          return;
        }

        // Check if this cell has already been dragged over
        const cellKey = `${row},${col}`;
        if (draggedCells.has(cellKey)) {
          return; // Don't apply action twice
        }

        // Determine or verify the drag axis
        let newAxis = dragAxis;

        if (dragAxis === null) {
          // First move after start - determine the axis
          if (row === dragStartRow && col !== dragStartCol) {
            newAxis = 'row';
          } else if (col === dragStartCol && row !== dragStartRow) {
            newAxis = 'column';
          } else if (row === dragStartRow && col === dragStartCol) {
            // Same cell as start, no axis determined yet
            return;
          } else {
            // Diagonal move - not allowed
            return;
          }
        } else {
          // Verify the move is along the locked axis
          if (newAxis === 'row' && row !== dragStartRow) {
            return; // Not on the same row
          }
          if (newAxis === 'column' && col !== dragStartCol) {
            return; // Not on the same column
          }
        }

        // Check if we can apply the action to this cell
        const currentState = playerGrid[row][col];

        // Respect cell state constraints
        if (dragAction === CellState.Filled && currentState === CellState.MarkedEmpty) {
          return; // Cannot fill a marked empty cell
        }
        if (dragAction === CellState.MarkedEmpty && currentState === CellState.Filled) {
          return; // Cannot mark empty a filled cell
        }

        // Apply the action to this cell
        const newGrid = playerGrid.map((r, i) =>
          i === row ? r.map((c, j) => (j === col ? dragAction : c)) : [...r]
        );

        // Add this cell to the dragged cells set
        const newDraggedCells = new Set(draggedCells);
        newDraggedCells.add(cellKey);

        set({
          playerGrid: newGrid,
          markLog: recordMark(markLog, currentPuzzle.width, row, col, dragAction),
          dragAxis: newAxis,
          draggedCells: newDraggedCells,
        });
      },

      // End the drag operation
      endDrag: () => {
        const { isDragging } = get();

        if (!isDragging) {
          return;
        }

        // Increment moves count for the entire drag operation
        set({
          isDragging: false,
          dragStartRow: null,
          dragStartCol: null,
          dragAction: null,
          dragAxis: null,
          draggedCells: new Set<string>(),
          moves: get().moves + 1,
        });

        // Check solution after drag completes
        get().checkSolution();
      },
    }),
    {
      name: 'nonogram-game',
      // Saves written before the replay feature have no markLog; default it so
      // a puzzle finished from one of those simply has nothing to replay.
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<GameStore>),
        markLog: (persisted as Partial<GameStore>)?.markLog ?? [],
        lastLevelId: (persisted as Partial<GameStore>)?.lastLevelId ?? DEFAULT_LEVEL_ID,
      }),
      partialize: (state) => ({
        lastLevelId: state.lastLevelId,
        currentPuzzle: state.currentPuzzle,
        playerGrid: state.playerGrid,
        currentMode: state.currentMode,
        moves: state.moves,
        isComplete: state.isComplete,
        markLog: state.markLog,
      }),
    }
  )
);
