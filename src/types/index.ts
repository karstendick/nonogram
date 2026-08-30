import { DifficultyRating } from '../logic/difficulty/types';

// Puzzle difficulty rating
export enum Difficulty {
  Easy = 'easy',
  Medium = 'medium',
  Hard = 'hard',
}

// Internal solver cell state (separate from UI CellState)
export enum SolverCell {
  Unknown = 0,
  Empty = 1,
  Filled = 2,
}

// Raw puzzle data from JSON
export interface PuzzleData {
  id: string;
  title: string;
  difficulty: Difficulty;
  solution: string[]; // Human-readable format (# = filled, . = empty)
}

// Parsed puzzle for game use
export interface Puzzle {
  id: string;
  title: string;
  /**
   * Legacy single-tier label, carried by premade puzzles and the original
   * generator. Being replaced by `rating`, which measures difficulty on two
   * independent axes; what the tiers should be called is deliberately still
   * open, so nothing maps `rating` back onto this yet.
   */
  difficulty?: Difficulty;
  /** Two-axis measured difficulty, on puzzles that have been rated. */
  rating?: DifficultyRating;
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
