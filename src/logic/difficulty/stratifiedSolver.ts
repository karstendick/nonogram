import { SolverCell } from '../../types';
import { LADDER, hasValidPlacement } from './techniques';
import { ALL_TECHNIQUES, LineKind, SolveTrace, Technique, TraceStep } from './types';

export interface LineClues {
  rowClues: number[][];
  columnClues: number[][];
  width: number;
  height: number;
}

export function blankGrid(width: number, height: number): SolverCell[][] {
  return Array.from({ length: height }, () => Array<SolverCell>(width).fill(SolverCell.Unknown));
}

function readLine(grid: SolverCell[][], kind: LineKind, index: number): SolverCell[] {
  return kind === 'row' ? [...grid[index]] : grid.map((row) => row[index]);
}

function emptyCounts(): Record<Technique, number> {
  return Object.fromEntries(ALL_TECHNIQUES.map((t) => [t, 0])) as Record<Technique, number>;
}

interface Candidate {
  kind: LineKind;
  index: number;
  technique: Technique;
  cells: { index: number; state: SolverCell.Filled | SolverCell.Empty }[];
}

/**
 * Solve as a person does: sweep every line looking for the cheapest technique
 * that moves, take one deduction, and start again from the cheapest rung.
 *
 * Only escalating when nothing cheaper works is what makes the resulting
 * technique rating mean "this puzzle requires X" rather than "a strong solver
 * happened to use X". Ties are broken deterministically — rows before columns,
 * then by index — because ratings are displayed and puzzles are shared by seed,
 * so the same puzzle must always trace identically.
 *
 * @param start Grid to solve from. Defaults to blank; hints will pass the
 *   player's current board instead.
 */
export interface TraceOptions {
  /**
   * Allow the one technique that reasons across lines. Without it the ladder
   * tops out at forced placement and the hardest puzzles are simply unsolvable.
   */
  allowDepth1?: boolean;
  /** Cap on hypotheses tried, since exhausting them is the expensive case. */
  depth1TrialBudget?: number;
}

export function traceSolve(
  puzzle: LineClues,
  start?: SolverCell[][],
  options: TraceOptions = {}
): SolveTrace {
  const { rowClues, columnClues, width, height } = puzzle;
  const grid = start ? start.map((row) => [...row]) : blankGrid(width, height);
  const steps: TraceStep[] = [];
  const techniqueCounts = emptyCounts();

  const cluesFor = (kind: LineKind, index: number) =>
    kind === 'row' ? rowClues[index] : columnClues[index];
  const lineCount = (kind: LineKind) => (kind === 'row' ? height : width);

  /**
   * A line with no unknowns left is skipped by the detectors, so a completed
   * line that contradicts its clues would otherwise go unnoticed and the solve
   * would claim success. hasValidPlacement on a complete line is exactly the
   * check that its clues match.
   */
  const allLinesValid = (): boolean => {
    for (const kind of ['row', 'column'] as const) {
      for (let index = 0; index < lineCount(kind); index++) {
        if (!hasValidPlacement(cluesFor(kind, index), readLine(grid, kind, index))) return false;
      }
    }
    return true;
  };

  let depth1Trials = 0;

  const finish = (knownContradiction: boolean): SolveTrace => {
    const unknownRemaining = grid.flat().filter((c) => c === SolverCell.Unknown).length;
    const contradiction = knownContradiction || !allLinesValid();
    const used = ALL_TECHNIQUES.filter((t) => techniqueCounts[t] > 0);
    return {
      steps,
      solved: !contradiction && unknownRemaining === 0,
      contradiction,
      unknownRemaining,
      techniqueCounts,
      maxTechnique: used.length > 0 ? Math.max(...used) : Technique.TrivialLine,
      depth1Trials,
    };
  };

  /**
   * The rung above line logic: assume a cell, propagate, and if that breaks the
   * puzzle the opposite value is forced. Only reached when every line technique
   * has failed, so a puzzle is never credited with needing this if something
   * cheaper would have finished it.
   */
  const findDepth1 = (): { row: number; col: number; state: SolverCell } | null => {
    const budget = options.depth1TrialBudget ?? Infinity;
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (grid[r][c] !== SolverCell.Unknown) continue;
        for (const guess of [SolverCell.Filled, SolverCell.Empty] as const) {
          if (depth1Trials >= budget) return null;
          depth1Trials++;
          const hypothesis = grid.map((row) => [...row]);
          hypothesis[r][c] = guess;
          if (solveToFixpoint(puzzle, hypothesis) !== null) continue;
          return {
            row: r,
            col: c,
            state: guess === SolverCell.Filled ? SolverCell.Empty : SolverCell.Filled,
          };
        }
      }
    }
    return null;
  };

  // A generous bound: every step reveals at least one cell, so it cannot loop.
  const maxSteps = width * height + 1;

  for (let step = 0; step < maxSteps; step++) {
    let chosen: Candidate | null = null;
    let actionableLines = 0;

    // Cheapest rung first; only escalate when the whole board offers nothing.
    for (const rung of LADDER) {
      const candidates: Candidate[] = [];
      for (const kind of ['row', 'column'] as const) {
        for (let index = 0; index < lineCount(kind); index++) {
          const line = readLine(grid, kind, index);
          if (!line.includes(SolverCell.Unknown)) continue;
          const found = rung.detect(cluesFor(kind, index), line);
          if (found)
            candidates.push({ kind, index, technique: rung.technique, cells: found.cells });
        }
      }
      if (candidates.length > 0) {
        chosen = candidates[0];
        actionableLines = candidates.length;
        break;
      }
    }

    if (!chosen && options.allowDepth1) {
      const forced = findDepth1();
      if (forced) {
        chosen = {
          kind: 'row',
          index: forced.row,
          technique: Technique.Depth1Contradiction,
          cells: [
            { index: forced.col, state: forced.state as SolverCell.Filled | SolverCell.Empty },
          ],
        };
        // A hypothesis is a single deduction like any other, so it counts as one
        // step and the work axis stays comparable across puzzles.
        actionableLines = 1;
      }
    }

    if (!chosen) return finish(false);

    for (const cell of chosen.cells) {
      if (chosen.kind === 'row') grid[chosen.index][cell.index] = cell.state;
      else grid[cell.index][chosen.index] = cell.state;
    }

    // The line just written, and every perpendicular line it crossed, must
    // still admit a placement.
    if (
      !hasValidPlacement(
        cluesFor(chosen.kind, chosen.index),
        readLine(grid, chosen.kind, chosen.index)
      )
    ) {
      return finish(true);
    }
    const acrossKind: LineKind = chosen.kind === 'row' ? 'column' : 'row';
    for (const cell of chosen.cells) {
      if (
        !hasValidPlacement(cluesFor(acrossKind, cell.index), readLine(grid, acrossKind, cell.index))
      ) {
        return finish(true);
      }
    }

    steps.push({
      kind: chosen.kind,
      index: chosen.index,
      technique: chosen.technique,
      revealed: chosen.cells.length,
      actionableLines,
    });
    techniqueCounts[chosen.technique] += 1;
  }

  return finish(false);
}

/** The grid a traced solve arrives at, for callers that need the cells rather than the trace. */
export function solveToFixpoint(puzzle: LineClues, start?: SolverCell[][]): SolverCell[][] | null {
  const { rowClues, columnClues, width, height } = puzzle;
  const grid = start ? start.map((row) => [...row]) : blankGrid(width, height);

  for (let pass = 0; pass < width * height + 1; pass++) {
    let changed = false;
    for (const kind of ['row', 'column'] as const) {
      const count = kind === 'row' ? height : width;
      for (let index = 0; index < count; index++) {
        const line = readLine(grid, kind, index);
        const clues = kind === 'row' ? rowClues[index] : columnClues[index];
        if (!line.includes(SolverCell.Unknown)) {
          // Still has to be checked: this is how a depth-1 hypothesis that
          // completes a line wrongly gets refuted.
          if (!hasValidPlacement(clues, line)) return null;
          continue;
        }
        for (const rung of LADDER) {
          const found = rung.detect(clues, line);
          if (!found) continue;
          for (const cell of found.cells) {
            if (kind === 'row') grid[index][cell.index] = cell.state;
            else grid[cell.index][index] = cell.state;
            line[cell.index] = cell.state;
          }
          changed = true;
          break;
        }
        if (!hasValidPlacement(clues, readLine(grid, kind, index))) return null;
      }
    }
    if (!changed) break;
  }
  return grid;
}
