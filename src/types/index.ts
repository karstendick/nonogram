// Raw puzzle data from JSON
export interface PuzzleData {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  solution: string[]; // Human-readable format (# = filled, . = empty)
}

// Parsed puzzle for game use
export interface Puzzle {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  width: number;
  height: number;
  solution: boolean[][]; // Parsed from string[] (true = filled, false = empty)
  rowClues: number[][]; // Generated from solution
  columnClues: number[][]; // Generated from solution
}

// Cell states in the game grid
export enum CellState {
  Empty = 0,
  Filled = 1,
  MarkedEmpty = 2,
}

// Interaction mode for mobile
export enum InteractionMode {
  Fill = 'fill',
  MarkEmpty = 'mark_empty',
}

// Game state
export interface GameState {
  puzzleId: string;
  currentGrid: CellState[][];
  currentMode: InteractionMode; // For mobile: which mode is active
  moves: number;
  isComplete: boolean;
}

// Puzzle collection
export interface PuzzleCollection {
  puzzles: PuzzleData[];
}
