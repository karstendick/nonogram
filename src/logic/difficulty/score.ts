import { SolverCell } from '../../types';
import { overlap } from './techniques';
import { LineClues, blankGrid } from './stratifiedSolver';
import { DifficultyRating, SolveTrace } from './types';

/**
 * Two-axis difficulty measurement.
 *
 * Difficulty is two things, not one: how TRICKY the techniques a solve demands
 * are, and how MUCH of that thinking it takes. A long grind of obvious moves and
 * a short puzzle with one nasty step are different kinds of hard, and one number
 * cannot say which you are looking at.
 *
 * Both are reported as measured — the hardest rung required, and the deduction
 * count — rather than rescaled onto a percentage.
 */

/**
 * Share of the board a single blank-grid overlap sweep reveals.
 *
 * The widest-range and cheapest signal measured: at 15x15 it spans about 62%
 * for a blobby puzzle down to 7% for a sparse one, for one sweep and no
 * iteration. Reported alongside the two axes rather than folded into them —
 * a generous opening mostly means a large supply of rung-1 deductions, so it
 * may be a proxy for the low end of both axes rather than an axis of its own.
 */
export function openingGenerosity(puzzle: LineClues): number {
  const { rowClues, columnClues, width, height } = puzzle;
  const grid = blankGrid(width, height);

  rowClues.forEach((clues, r) => {
    const found = overlap(clues, grid[r]);
    for (const cell of found?.cells ?? []) grid[r][cell.index] = cell.state;
  });
  columnClues.forEach((clues, c) => {
    const column = grid.map((row) => row[c]);
    const found = overlap(clues, column);
    for (const cell of found?.cells ?? []) grid[cell.index][c] = cell.state;
  });

  const known = grid.flat().filter((cell) => cell !== SolverCell.Unknown).length;
  return known / (width * height);
}

/**
 * Turn a completed trace into a rating.
 *
 * The technique reading is the MAX rung the solve required, not the
 * distribution. Sudoku rating systems use a max and are criticised for it — one
 * clever step making a puzzle "hard" while a two-hundred-move grind rates easy —
 * but that flaw does not bite here, because the thing a max loses is exactly
 * what the deduction count carries.
 *
 * The full distribution is kept in the trace regardless, so revisiting this is
 * a change to this function alone rather than a re-run.
 */
export function rateTrace(trace: SolveTrace, puzzle: LineClues): DifficultyRating {
  const cells = puzzle.width * puzzle.height;
  const deductions = trace.steps.length;

  return {
    maxTechnique: trace.maxTechnique,
    deductions,
    cellsPerDeduction: deductions > 0 ? cells / deductions : 0,
    openingGenerosity: openingGenerosity(puzzle),
    bottleneckSteps: trace.steps.filter((s) => s.actionableLines === 1).length,
    techniqueCounts: trace.techniqueCounts,
  };
}
