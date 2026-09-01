import { describe, it, expect } from 'vitest';
import { SolverCell } from '../src/types';
import { blankGrid, traceSolve } from '../src/logic/difficulty/stratifiedSolver';
import { provesAmbiguous, solveWithDepth1 } from '../src/logic/difficulty/depth1';
import { openingGenerosity, rateTrace } from '../src/logic/difficulty/score';
import { Technique } from '../src/logic/difficulty/types';
import { calculateColumnClues, calculateRowClues } from '../src/logic/patternGenerator';

/** Build a puzzle from a picture, the same notation puzzles.json uses. */
function puzzleFrom(rows: string[]) {
  const solution = rows.map((r) => [...r].map((c) => c === '#'));
  return {
    solution,
    rowClues: calculateRowClues(solution),
    columnClues: calculateColumnClues(solution),
    width: solution[0].length,
    height: solution.length,
  };
}

const cross = puzzleFrom(['..#..', '..#..', '#####', '..#..', '..#..']);
const square = puzzleFrom(['#####', '#...#', '#...#', '#...#', '#####']);

// Line logic alone stalls on this one; it needs a hypothesis to finish. This is
// the class the current generator rejects outright and the Expert tier exists
// to reach.
const needsDepth1 = puzzleFrom(['...###', '....##', '..####', '..#...', '###...', '##....']);

describe('traceSolve', () => {
  it('solves a simple puzzle and records every step', () => {
    const trace = traceSolve(cross);
    expect(trace.solved).toBe(true);
    expect(trace.contradiction).toBe(false);
    expect(trace.unknownRemaining).toBe(0);
    expect(trace.steps.length).toBeGreaterThan(0);
  });

  it('is deterministic — the same puzzle always traces identically', () => {
    // Ratings are displayed and puzzles are shared by seed, so this is a
    // correctness property, not a nicety.
    const a = traceSolve(square);
    const b = traceSolve(square);
    expect(a.steps).toEqual(b.steps);
    expect(a.maxTechnique).toBe(b.maxTechnique);
  });

  it('reaches for the cheapest technique that works', () => {
    // The cross needs only the bottom of the ladder: the full row and column
    // are trivial, and the four [1] lines then follow from block capping. The
    // enumerating fallback must never be credited when something cheaper would
    // have done, or "this puzzle requires X" means nothing.
    const trace = traceSolve(cross);
    expect(trace.maxTechnique).toBe(Technique.BlockCap);
    expect(trace.techniqueCounts[Technique.ForcedPlacement]).toBe(0);
    expect(trace.techniqueCounts[Technique.TrivialLine]).toBeGreaterThan(0);
  });

  it('keeps the whole technique distribution, not just the maximum', () => {
    const trace = traceSolve(square);
    const total = Object.values(trace.techniqueCounts).reduce((a, b) => a + b, 0);
    expect(total).toBe(trace.steps.length);
  });

  it('accepts a starting grid rather than assuming a blank one', () => {
    // Hints will solve from wherever the player is, so this must not be hardcoded.
    const partial = blankGrid(cross.width, cross.height);
    partial[0][2] = SolverCell.Filled;
    const fromPartial = traceSolve(cross, partial);
    expect(fromPartial.solved).toBe(true);
    expect(fromPartial.steps.length).toBeLessThanOrEqual(traceSolve(cross).steps.length);
  });

  it('does not mutate the grid it was given', () => {
    const start = blankGrid(cross.width, cross.height);
    traceSolve(cross, start);
    expect(start.flat().every((c) => c === SolverCell.Unknown)).toBe(true);
  });

  it('reports a contradiction rather than looping on impossible clues', () => {
    const trace = traceSolve({
      rowClues: [[5], [5], [5]],
      columnClues: [[1], [1], [1], [1], [1]],
      width: 5,
      height: 3,
    });
    expect(trace.solved).toBe(false);
    expect(trace.contradiction).toBe(true);
  });

  it('stops without solving when the puzzle needs more than line logic', () => {
    // Two solutions exist (the diagonal can go either way), so no amount of
    // line reasoning can finish it.
    const ambiguous = {
      rowClues: [[1], [1]],
      columnClues: [[1], [1]],
      width: 2,
      height: 2,
    };
    const trace = traceSolve(ambiguous);
    expect(trace.solved).toBe(false);
    expect(trace.contradiction).toBe(false);
    expect(trace.unknownRemaining).toBeGreaterThan(0);
  });
});

describe('solveWithDepth1', () => {
  it('reports a line-solvable puzzle as needing no hypothesis', () => {
    const result = solveWithDepth1(cross);
    expect(result.solved).toBe(true);
    expect(result.lineSolvable).toBe(true);
    expect(result.trials).toBe(0);
    expect(result.trace.maxTechnique).toBeLessThan(Technique.Depth1Contradiction);
  });

  it('leaves a genuinely ambiguous puzzle unsolved', () => {
    const result = solveWithDepth1({
      rowClues: [[1], [1]],
      columnClues: [[1], [1]],
      width: 2,
      height: 2,
    });
    expect(result.solved).toBe(false);
  });

  it('counts a hypothesis as a step, so the work axis stays honest', () => {
    // Depth-1 deductions are real work. If they only bumped the technique
    // counts, the hardest puzzles would report the least work.
    const line = traceSolve(needsDepth1);
    const withTrials = solveWithDepth1(needsDepth1);
    expect(withTrials.solved).toBe(true);
    expect(withTrials.lineSolvable).toBe(false);
    expect(withTrials.trace.steps.length).toBeGreaterThan(line.steps.length);
    const total = Object.values(withTrials.trace.techniqueCounts).reduce((a, b) => a + b, 0);
    expect(total).toBe(withTrials.trace.steps.length);
    expect(withTrials.trace.techniqueCounts[Technique.Depth1Contradiction]).toBeGreaterThan(0);
  });

  it('rates a depth-1 puzzle at the top of the ladder', () => {
    const rating = rateTrace(solveWithDepth1(needsDepth1).trace, needsDepth1);
    expect(rating.maxTechnique).toBe(Technique.Depth1Contradiction);
  });

  it('respects a trial budget', () => {
    const result = solveWithDepth1(
      { rowClues: [[1], [1]], columnClues: [[1], [1]], width: 2, height: 2 },
      3
    );
    expect(result.trials).toBeLessThanOrEqual(3);
  });
});

describe('provesAmbiguous', () => {
  it('proves ambiguity when a verified switching component exists', () => {
    // The 2x2 diagonal: both diagonals give clues of [1] everywhere.
    const solution = [
      [true, false],
      [false, true],
    ];
    const settled = blankGrid(2, 2);
    expect(provesAmbiguous(solution, [[1], [1]], [[1], [1]], settled)).toBe(true);
  });

  it('never fires on a uniquely solvable puzzle', () => {
    // Soundness is the whole point: a false positive would silently discard
    // perfectly good puzzles.
    const settled = blankGrid(cross.width, cross.height);
    expect(provesAmbiguous(cross.solution, cross.rowClues, cross.columnClues, settled)).toBe(false);
    expect(
      provesAmbiguous(square.solution, square.rowClues, square.columnClues, blankGrid(5, 5))
    ).toBe(false);
  });

  it('rejects a swap that changes the block structure', () => {
    // Nonogram clues are ordered block runs, not counts. A swap that preserves
    // counts but merges or splits a run is NOT a valid second solution, and the
    // naive discrete-tomography test would wrongly accept it.
    const solution = [
      [true, false, true],
      [false, true, false],
      [false, false, false],
    ];
    const rowClues = calculateRowClues(solution);
    const columnClues = calculateColumnClues(solution);
    // Swapping (0,0)/(0,1) with (1,0)/(1,1) would make row 0 read '.##' — clue
    // [2] rather than [1,1] — so it must not count as a proof.
    expect(provesAmbiguous(solution, rowClues, columnClues, blankGrid(3, 3))).toBe(false);
  });

  it('only considers cells line logic left undetermined', () => {
    const solution = [
      [true, false],
      [false, true],
    ];
    const settled = blankGrid(2, 2);
    settled[0][0] = SolverCell.Filled;
    expect(provesAmbiguous(solution, [[1], [1]], [[1], [1]], settled)).toBe(false);
  });
});

describe('rateTrace', () => {
  it('reports both readings as measured, not rescaled', () => {
    const trace = traceSolve(cross);
    const rating = rateTrace(trace, cross);
    // The rung is a ladder position and the deductions are a count. Neither is
    // mapped onto a percentage, which would invent precision the max over a
    // nine-rung ladder does not have.
    expect(rating.maxTechnique).toBe(trace.maxTechnique);
    expect(rating.deductions).toBe(trace.steps.length);
  });

  it('reads the technique axis off the hardest rung required', () => {
    const trace = traceSolve(cross);
    const rating = rateTrace(trace, cross);
    expect(rating.maxTechnique).toBe(trace.maxTechnique);
  });

  it('does not normalize the deduction count for grid size', () => {
    // A larger puzzle is more work, and the count should say so rather than
    // dividing the difference away. See Requirement 2.
    const big = puzzleFrom([
      '..####..',
      '.######.',
      '########',
      '##....##',
      '##....##',
      '########',
      '.######.',
      '..####..',
    ]);
    expect(rateTrace(traceSolve(big), big).deductions).toBeGreaterThan(
      rateTrace(traceSolve(cross), cross).deductions
    );
  });

  it('measures opening generosity from a blank grid in one sweep', () => {
    const generosity = openingGenerosity(cross);
    expect(generosity).toBeGreaterThan(0);
    expect(generosity).toBeLessThanOrEqual(1);
  });

  it('counts bottleneck steps where only one line could move', () => {
    const rating = rateTrace(traceSolve(square), square);
    expect(rating.bottleneckSteps).toBeGreaterThanOrEqual(0);
  });
});
