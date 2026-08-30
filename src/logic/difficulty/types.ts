import { SolverCell } from '../../types';

/**
 * The technique ladder: the named deductions a human uses, ordered from
 * cheapest to hardest. A puzzle's technique rating is the hardest rung its
 * solve requires, so the numeric values are meaningful and must stay ordered.
 *
 * Rungs 0-7 work within a single line. Rung 8 is the only one that reasons
 * across lines, by assuming a cell and deriving a contradiction.
 */
export enum Technique {
  TrivialLine = 0,
  Overlap = 1,
  EdgeAnchor = 2,
  BlockCap = 3,
  GapTooSmall = 4,
  Completion = 5,
  SegmentPartition = 6,
  ForcedPlacement = 7,
  Depth1Contradiction = 8,
}

export const ALL_TECHNIQUES: Technique[] = [
  Technique.TrivialLine,
  Technique.Overlap,
  Technique.EdgeAnchor,
  Technique.BlockCap,
  Technique.GapTooSmall,
  Technique.Completion,
  Technique.SegmentPartition,
  Technique.ForcedPlacement,
  Technique.Depth1Contradiction,
];

export const TECHNIQUE_NAMES: Record<Technique, string> = {
  [Technique.TrivialLine]: 'trivial line',
  [Technique.Overlap]: 'overlap',
  [Technique.EdgeAnchor]: 'edge anchoring',
  [Technique.BlockCap]: 'block capping',
  [Technique.GapTooSmall]: 'gap too small',
  [Technique.Completion]: 'completion',
  [Technique.SegmentPartition]: 'segment partitioning',
  [Technique.ForcedPlacement]: 'forced placement',
  [Technique.Depth1Contradiction]: 'contradiction',
};

/** A single cell a technique determined, and what it determined it to be. */
export interface DeducedCell {
  index: number;
  state: SolverCell.Filled | SolverCell.Empty;
}

/**
 * Why a deduction holds. Difficulty scoring ignores this entirely; it exists so
 * the same detectors can later explain a hint in words. See the deferred hints
 * section of docs/specs/puzzle-difficulty.md.
 */
export interface Evidence {
  clueIndices: number[];
  description: string;
}

/** What a technique found in one line, or null if it found nothing new. */
export interface LineDeduction {
  cells: DeducedCell[];
  technique: Technique;
  evidence: Evidence;
}

/** A line detector: pure, and never allowed to report cells that were already known. */
export type LineTechnique = (clues: number[], line: SolverCell[]) => LineDeduction | null;

export type LineKind = 'row' | 'column';

/** One deduction in a solve, in the order it was made. */
export interface TraceStep {
  kind: LineKind;
  index: number;
  technique: Technique;
  revealed: number;
  /**
   * How many lines could have been advanced at this technique rung when this
   * step was taken. This is the Family C breadth signal: 1 means the solver had
   * exactly one move available and a human would have had to hunt for it.
   */
  actionableLines: number;
}

export interface SolveTrace {
  steps: TraceStep[];
  solved: boolean;
  /** True if a line was found with no valid placement — the puzzle is broken. */
  contradiction: boolean;
  /** Cells still unknown when the solve stopped. */
  unknownRemaining: number;
  /**
   * Full distribution, not just the maximum. The technique rating currently
   * reads only the max, but keeping the distribution makes revisiting that a
   * scoring change rather than a re-run. See Open Question 12.
   */
  techniqueCounts: Record<Technique, number>;
  maxTechnique: Technique;
  /** Hypotheses tried by the depth-1 search, if it ran. */
  depth1Trials: number;
}

/**
 * A puzzle's difficulty, on two independent axes.
 *
 * Deliberately NOT normalized for grid size: a larger puzzle is more work, and
 * the work axis should say so. See Requirement 2 of the spec.
 */
export interface DifficultyRating {
  /** 0-100 on the technique axis. Derived from maxTechnique. */
  technique: number;
  /** 0-100 on the work axis. Derived from the number of deductions. */
  work: number;

  // The raw measurements the scores are derived from, kept for calibration.
  maxTechnique: Technique;
  deductions: number;
  cellsPerDeduction: number;
  /** Share of the board a single blank-grid overlap sweep reveals, 0-1. */
  openingGenerosity: number;
  /** Steps where exactly one line was actionable. */
  bottleneckSteps: number;
  techniqueCounts: Record<Technique, number>;
}
