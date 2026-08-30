import { SolverCell } from '../../types';
import { calculateArrayClues } from '../patternGenerator';
import { LineClues, traceSolve } from './stratifiedSolver';
import { SolveTrace } from './types';

/**
 * The rung above line logic: assume a cell, propagate, and if that leads to a
 * contradiction the opposite value is forced. This is the only technique that
 * reasons across lines, and it is the only measured route to puzzles genuinely
 * harder than the current generator can produce.
 */

export interface Depth1Result {
  trace: SolveTrace;
  /** True if the puzzle was finished, with or without needing a hypothesis. */
  solved: boolean;
  /** True if line logic alone was enough — no hypothesis required. */
  lineSolvable: boolean;
  trials: number;
}

/**
 * Solve with hypotheses allowed.
 *
 * Line logic runs first and only stalls escalate to a trial, so a puzzle is
 * only ever rated as needing depth-1 if nothing cheaper would finish it. The
 * hypotheses are recorded as steps in the same trace as every other deduction,
 * which is what keeps the work axis honest on the hardest puzzles.
 */
export function solveWithDepth1(puzzle: LineClues, trialBudget = Infinity): Depth1Result {
  const lineOnly = traceSolve(puzzle);
  if (lineOnly.solved || lineOnly.contradiction || trialBudget <= 0) {
    return {
      trace: lineOnly,
      solved: lineOnly.solved,
      lineSolvable: lineOnly.solved,
      trials: 0,
    };
  }

  const trace = traceSolve(puzzle, undefined, {
    allowDepth1: true,
    depth1TrialBudget: trialBudget,
  });

  return {
    trace,
    solved: trace.solved,
    lineSolvable: false,
    trials: trace.depth1Trials,
  };
}

/**
 * A sound proof of ambiguity: informative when it fires, never wrong.
 *
 * Looks for a switching component — two rows and two columns whose four
 * intersection cells are still undetermined and alternate filled/empty in the
 * known solution. Swapping them produces a different grid.
 *
 * The verification step is what makes this a proof rather than a heuristic. In
 * discrete tomography, where clues are row and column COUNTS, a 2x2 swap
 * trivially preserves them. Nonogram clues encode ordered block RUNS, which a
 * swap can merge or split, so the naive test is unsound here. Recomputing the
 * four affected lines' clues and comparing is cheap and exact.
 *
 * Never fires on a uniquely-solvable puzzle, so it costs no good candidates. It
 * is deliberately incomplete: when it finds nothing that means "no proof", not
 * "unique", and the caller must fall through to the full check.
 */
export function provesAmbiguous(
  solution: boolean[][],
  rowClues: number[][],
  columnClues: number[][],
  settled: SolverCell[][]
): boolean {
  const height = solution.length;
  const width = solution[0].length;

  const undetermined = (r: number, c: number) => settled[r][c] === SolverCell.Unknown;
  const sameClues = (a: number[], b: number[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);

  /** The line with two cells swapped, without copying the rest of the grid. */
  const swappedRow = (r: number, c1: number, c2: number): boolean[] => {
    const row = [...solution[r]];
    [row[c1], row[c2]] = [row[c2], row[c1]];
    return row;
  };
  const swappedColumn = (c: number, r1: number, r2: number): boolean[] => {
    const column = solution.map((row) => row[c]);
    [column[r1], column[r2]] = [column[r2], column[r1]];
    return column;
  };

  for (let r1 = 0; r1 < height; r1++) {
    for (let r2 = r1 + 1; r2 < height; r2++) {
      for (let c1 = 0; c1 < width; c1++) {
        if (!undetermined(r1, c1) || !undetermined(r2, c1)) continue;
        for (let c2 = c1 + 1; c2 < width; c2++) {
          if (!undetermined(r1, c2) || !undetermined(r2, c2)) continue;

          // Only an alternating corner pattern can be swapped at all.
          const a = solution[r1][c1];
          const b = solution[r1][c2];
          if (a === b) continue;
          if (solution[r2][c1] !== b || solution[r2][c2] !== a) continue;

          // Rows are checked first because they are the cheaper way to fail.
          if (!sameClues(calculateArrayClues(swappedRow(r1, c1, c2)), rowClues[r1])) continue;
          if (!sameClues(calculateArrayClues(swappedRow(r2, c1, c2)), rowClues[r2])) continue;
          if (!sameClues(calculateArrayClues(swappedColumn(c1, r1, r2)), columnClues[c1])) continue;
          if (!sameClues(calculateArrayClues(swappedColumn(c2, r1, r2)), columnClues[c2])) continue;

          // Both grids satisfy every clue, so a second solution exists.
          return true;
        }
      }
    }
  }

  return false;
}
