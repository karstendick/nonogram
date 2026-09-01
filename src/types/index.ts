import { StoredRating } from '../logic/difficulty/types';

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
  /**
   * Precomputed by `npm run rate-premades`. These puzzles never change, so
   * their ratings are constants; computing them at load would be recomputing a
   * constant during the idle period speculative generation wants. A test keeps
   * the stored values honest.
   */
  rating: StoredRating;
  solution: string[]; // Human-readable format (# = filled, . = empty)
}

// Parsed puzzle for game use
export interface Puzzle {
  id: string;
  title: string;
  /**
   * Measured difficulty on two independent axes. Nothing maps this back onto a
   * single named tier: how many tiers there should be and what to call them is
   * deliberately still open, pending real play experience.
   */
  rating?: StoredRating;
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
