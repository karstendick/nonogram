import { SolverCell } from '../../types';
import { overlap } from './techniques';
import { LineClues, blankGrid } from './stratifiedSolver';
import { DifficultyRating, SolveTrace, Technique } from './types';

/**
 * Two-axis difficulty scoring.
 *
 * Difficulty is two things, not one: how much WORK a solve takes, and how
 * TRICKY the techniques it demands are. A long grind of obvious moves and a
 * short puzzle with one nasty step are different kinds of hard, and collapsing
 * them into a single number throws that distinction away. So both are scored,
 * and both are reported.
 *
 * Neither axis is normalized for grid size. A larger puzzle genuinely is more
 * work, and the work axis should say so.
 */

/**
 * Where each rung of the ladder sits on the 0-100 technique axis.
 *
 * PROVISIONAL. The gaps are guesses at how much harder each rung feels, to be
 * replaced by whatever the bake-off corpus says. The ordering is not a guess.
 */
export const TECHNIQUE_SCORES: Record<Technique, number> = {
  [Technique.TrivialLine]: 0,
  [Technique.Overlap]: 8,
  [Technique.EdgeAnchor]: 20,
  [Technique.BlockCap]: 28,
  [Technique.GapTooSmall]: 36,
  [Technique.Completion]: 44,
  [Technique.SegmentPartition]: 60,
  [Technique.ForcedPlacement]: 78,
  [Technique.Depth1Contradiction]: 100,
};

/**
 * Deduction counts that anchor the ends of the work axis, per grid area.
 *
 * Set from the calibration run (`npm run calibrate`), which measured 15x15
 * solves spanning roughly 0.28 to 0.61 deductions per cell. The anchors bracket
 * that a little wider so the ends of the axis are reachable but not crowded.
 *
 * Note these are much higher than the exploratory probes in the spec suggested.
 * Those used a greedy highest-yield solve policy; taking the cheapest available
 * technique instead produces many more, smaller deductions, which is the whole
 * point of the policy but roughly doubles the step count.
 */
export const WORK_ANCHORS = { lightPerCell: 0.22, heavyPerCell: 0.7 };

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

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
 * The technique axis is the MAX rung the solve required, not the distribution.
 * Sudoku rating systems use a max and are criticised for it — one clever step
 * making a puzzle "hard" while a two-hundred-move grind rates easy — but that
 * flaw does not bite here, because the thing a max loses is exactly what the
 * work axis carries. Separating the axes is what makes the simple choice safe.
 *
 * The full distribution is kept in the trace regardless, so revisiting this is
 * a change to this function alone rather than a re-run.
 */
export function rateTrace(trace: SolveTrace, puzzle: LineClues): DifficultyRating {
  const cells = puzzle.width * puzzle.height;
  const deductions = trace.steps.length;
  const perCell = deductions / cells;
  const { lightPerCell, heavyPerCell } = WORK_ANCHORS;

  return {
    technique: TECHNIQUE_SCORES[trace.maxTechnique],
    work: Math.round(100 * clamp01((perCell - lightPerCell) / (heavyPerCell - lightPerCell))),
    maxTechnique: trace.maxTechnique,
    deductions,
    cellsPerDeduction: deductions > 0 ? cells / deductions : 0,
    openingGenerosity: openingGenerosity(puzzle),
    bottleneckSteps: trace.steps.filter((s) => s.actionableLines === 1).length,
    techniqueCounts: trace.techniqueCounts,
  };
}
