import _ from 'lodash';
import { SolverCell } from '../../types';
import { solveArray } from '../solver';
import { DeducedCell, Evidence, LineDeduction, LineTechnique, Technique } from './types';

/**
 * The technique ladder, one detector per rung.
 *
 * Every detector is deliberately WEAKER than the enumerating solver in
 * solver.ts. That is the point: an all-powerful line solver flattens "obvious
 * overlap" and "forced among 400 placements" into the same operation, and then
 * cannot tell you which techniques a puzzle actually requires. Difficulty
 * measurement needs a solver that reaches for the cheapest technique that
 * works, exactly as a person does.
 *
 * Detectors are pure, never report cells that were already known, and return
 * null when they find nothing.
 */

/** Clues of [0] mean an empty line; treat it as no blocks at all. */
export function realClues(clues: number[]): number[] {
  return clues.length === 1 && clues[0] === 0 ? [] : clues;
}

/** Smallest span the blocks can occupy: the blocks plus one gap between each. */
export function minSpan(clues: number[]): number {
  const real = realClues(clues);
  if (real.length === 0) return 0;
  return _.sum(real) + real.length - 1;
}

/** Start index of each block when every block is packed as far left as possible. */
function leftmostStarts(clues: number[]): number[] {
  const starts: number[] = [];
  let pos = 0;
  for (const size of clues) {
    starts.push(pos);
    pos += size + 1;
  }
  return starts;
}

/** Start index of each block when every block is packed as far right as possible. */
function rightmostStarts(clues: number[], length: number): number[] {
  const starts: number[] = [];
  let end = length;
  for (let i = clues.length - 1; i >= 0; i--) {
    starts[i] = end - clues[i];
    end = starts[i] - 1;
  }
  return starts;
}

/** Maximal runs of Filled cells, as inclusive [start, end] pairs. */
export function filledRuns(line: SolverCell[]): [number, number][] {
  const runs: [number, number][] = [];
  let start = -1;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === SolverCell.Filled) {
      if (start === -1) start = i;
    } else if (start !== -1) {
      runs.push([start, i - 1]);
      start = -1;
    }
  }
  if (start !== -1) runs.push([start, line.length - 1]);
  return runs;
}

/**
 * Stretches of line that could still hold blocks: maximal runs of non-Empty
 * cells. Known-empty cells are what partition a line into segments, and that
 * partitioning is what several techniques reason from.
 */
export function segments(line: SolverCell[]): [number, number][] {
  const segs: [number, number][] = [];
  let start = -1;
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== SolverCell.Empty) {
      if (start === -1) start = i;
    } else if (start !== -1) {
      segs.push([start, i - 1]);
      start = -1;
    }
  }
  if (start !== -1) segs.push([start, line.length - 1]);
  return segs;
}

/** Keep only cells that are genuinely new, so a detector cannot claim old ground. */
function newCells(line: SolverCell[], cells: DeducedCell[]): DeducedCell[] {
  const seen = new Set<number>();
  return cells.filter((c) => {
    if (line[c.index] !== SolverCell.Unknown || seen.has(c.index)) return false;
    seen.add(c.index);
    return true;
  });
}

function deduction(
  line: SolverCell[],
  cells: DeducedCell[],
  technique: Technique,
  evidence: Evidence
): LineDeduction | null {
  const fresh = newCells(line, cells);
  return fresh.length > 0 ? { cells: fresh, technique, evidence } : null;
}

const fill = (index: number): DeducedCell => ({ index, state: SolverCell.Filled });
const clear = (index: number): DeducedCell => ({ index, state: SolverCell.Empty });

/**
 * Rung 0 — the line needs no thought at all: it has no blocks, or its blocks
 * only fit one way because they exactly fill the available span.
 */
export const trivialLine: LineTechnique = (clues, line) => {
  const real = realClues(clues);

  if (real.length === 0) {
    return deduction(line, _.range(line.length).map(clear), Technique.TrivialLine, {
      clueIndices: [],
      description: 'the line has no blocks, so every cell is empty',
    });
  }

  if (minSpan(real) === line.length) {
    const cells: DeducedCell[] = [];
    let pos = 0;
    real.forEach((size, i) => {
      for (let k = 0; k < size; k++) cells.push(fill(pos + k));
      pos += size;
      if (i < real.length - 1) cells.push(clear(pos++));
    });
    return deduction(line, cells, Technique.TrivialLine, {
      clueIndices: _.range(real.length),
      description:
        'the blocks and their gaps exactly fill the line, so there is only one way to place them',
    });
  }

  return null;
};

/**
 * Rung 1 — simple overlap, the first move every nonogram player learns.
 *
 * Deliberately context-free: it looks only at the clues and the line length,
 * ignoring cells already known. That is what separates it from every rung
 * above, and what makes "how much falls out of pure overlap" measurable.
 */
export const overlap: LineTechnique = (clues, line) => {
  const real = realClues(clues);
  if (real.length === 0 || minSpan(real) > line.length) return null;

  const left = leftmostStarts(real);
  const right = rightmostStarts(real, line.length);
  const cells: DeducedCell[] = [];
  const used: number[] = [];

  real.forEach((size, i) => {
    // The block covers these cells no matter how far left or right it sits.
    for (let p = right[i]; p <= left[i] + size - 1; p++) cells.push(fill(p));
    if (right[i] <= left[i] + size - 1) used.push(i);
  });

  return deduction(line, cells, Technique.Overlap, {
    clueIndices: used,
    description: 'the block is long enough that part of it is covered wherever it sits',
  });
};

/**
 * Rung 2 — edge anchoring. Once the cells before a filled cell are all known
 * empty, the first block has nowhere to start but there.
 */
export const edgeAnchor: LineTechnique = (clues, line) => {
  const real = realClues(clues);
  if (real.length === 0) return null;
  const n = line.length;

  const anchorFrom = (reversed: boolean): { cells: DeducedCell[]; clueIndex: number } | null => {
    const view = reversed ? [...line].reverse() : line;
    const size = reversed ? real[real.length - 1] : real[0];
    const clueIndex = reversed ? real.length - 1 : 0;

    let p = 0;
    while (p < n && view[p] === SolverCell.Empty) p++;
    if (p >= n || view[p] !== SolverCell.Filled) return null;
    if (p + size > n) return null;

    const local: DeducedCell[] = [];
    for (let k = 0; k < size; k++) local.push(fill(p + k));
    if (p + size < n) local.push(clear(p + size));

    const mapped = local.map((c) => ({
      index: reversed ? n - 1 - c.index : c.index,
      state: c.state,
    }));
    return { cells: mapped, clueIndex };
  };

  const head = anchorFrom(false);
  const tail = anchorFrom(true);
  const cells = [...(head?.cells ?? []), ...(tail?.cells ?? [])];
  const clueIndices = [head?.clueIndex, tail?.clueIndex].filter(
    (i): i is number => i !== undefined
  );

  return deduction(line, cells, Technique.EdgeAnchor, {
    clueIndices,
    description:
      'everything before this filled cell is empty, so the outermost block must start here',
  });
};

/**
 * Rung 3 — reasoning about a run of filled cells whose block is pinned down.
 *
 * Three ways that happens: the line has only one block, so it must cover every
 * filled cell; a run is already as long as the longest clue, so it is finished
 * and its neighbours are empty; or a run is anchored against an empty cell or
 * the line's end, so the block covering it starts exactly there and reaches at
 * least as far as the smallest block that could contain it. The last of these
 * is the "glue" move, and it is what keeps easy lines from falling through to
 * the expensive rungs.
 */
export const blockCap: LineTechnique = (clues, line) => {
  const real = realClues(clues);
  if (real.length === 0) return null;

  const runs = filledRuns(line);
  if (runs.length === 0) return null;
  const n = line.length;
  const cells: DeducedCell[] = [];
  const clueIndices: number[] = [];

  // Glue: a run that cannot grow leftwards must extend rightwards to at least
  // the smallest block able to contain it, and vice versa.
  for (const [a, b] of runs) {
    const length = b - a + 1;
    const candidates = real.filter((size) => size >= length);
    if (candidates.length === 0) continue;
    const smallest = Math.min(...candidates);

    const anchoredLeft = a === 0 || line[a - 1] === SolverCell.Empty;
    const anchoredRight = b === n - 1 || line[b + 1] === SolverCell.Empty;

    if (anchoredLeft && a + smallest <= n) {
      for (let p = a; p < a + smallest; p++) cells.push(fill(p));
      // Only when every candidate block is that size do we know where it ends.
      if (candidates.every((size) => size === smallest) && a + smallest < n) {
        cells.push(clear(a + smallest));
      }
      clueIndices.push(real.indexOf(smallest));
    }
    if (anchoredRight && b - smallest + 1 >= 0) {
      for (let p = b - smallest + 1; p <= b; p++) cells.push(fill(p));
      if (candidates.every((size) => size === smallest) && b - smallest >= 0) {
        cells.push(clear(b - smallest));
      }
      clueIndices.push(real.indexOf(smallest));
    }
  }

  if (real.length === 1) {
    // One block: it has to cover every filled cell, which pins it down a lot.
    const size = real[0];
    const first = runs[0][0];
    const last = runs[runs.length - 1][1];
    const earliest = Math.max(0, last - size + 1);
    const latest = Math.min(first, n - size);
    if (earliest <= latest) {
      for (let p = latest; p <= earliest + size - 1; p++) cells.push(fill(p));
      // Cells no placement can reach are empty.
      for (let p = 0; p < earliest; p++) cells.push(clear(p));
      for (let p = latest + size; p < n; p++) cells.push(clear(p));
      clueIndices.push(0);
    }
  } else {
    const longest = Math.max(...real);
    for (const [a, b] of runs) {
      if (b - a + 1 !== longest) continue;
      // A run as long as the longest clue is a finished block; seal both ends.
      if (a > 0) cells.push(clear(a - 1));
      if (b < n - 1) cells.push(clear(b + 1));
      clueIndices.push(real.indexOf(longest));
    }
  }

  return deduction(line, cells, Technique.BlockCap, {
    clueIndices: _.uniq(clueIndices),
    description:
      'this run of filled cells is already as long as its block can be, so its neighbours are empty',
  });
};

/**
 * Rung 4 — a stretch of line too short to hold any remaining block cannot hold
 * one, so it is all empty.
 */
export const gapTooSmall: LineTechnique = (clues, line) => {
  const real = realClues(clues);
  if (real.length === 0) return null;

  const smallest = Math.min(...real);
  const cells: DeducedCell[] = [];

  for (const [a, b] of segments(line)) {
    if (b - a + 1 >= smallest) continue;
    for (let p = a; p <= b; p++) cells.push(clear(p));
  }

  return deduction(line, cells, Technique.GapTooSmall, {
    clueIndices: [real.indexOf(smallest)],
    description: 'this gap is too short for even the smallest remaining block',
  });
};

/**
 * Rung 5 — counting. Once as many cells are filled as the clues call for, the
 * rest are empty; once only exactly enough cells remain, they are all filled.
 */
export const completion: LineTechnique = (clues, line) => {
  const real = realClues(clues);
  const target = _.sum(real);
  const filled = line.filter((c) => c === SolverCell.Filled).length;
  const unknown = line.filter((c) => c === SolverCell.Unknown).length;
  if (unknown === 0) return null;

  if (filled === target) {
    const cells = _.range(line.length)
      .filter((i) => line[i] === SolverCell.Unknown)
      .map(clear);
    return deduction(line, cells, Technique.Completion, {
      clueIndices: _.range(real.length),
      description: 'every block is already accounted for, so the rest of the line is empty',
    });
  }

  if (filled + unknown === target) {
    const cells = _.range(line.length)
      .filter((i) => line[i] === SolverCell.Unknown)
      .map(fill);
    return deduction(line, cells, Technique.Completion, {
      clueIndices: _.range(real.length),
      description:
        'only exactly enough cells are left for the remaining blocks, so all of them are filled',
    });
  }

  return null;
};

/**
 * Assign clues to segments as early as possible, greedily. Returns the segment
 * index each clue lands in, or null if the clues cannot be fitted at all.
 */
function earliestAssignment(clues: number[], segs: [number, number][]): number[] | null {
  const assignment: number[] = [];
  let seg = 0;
  let used = 0;

  for (const size of clues) {
    for (;;) {
      if (seg >= segs.length) return null;
      const capacity = segs[seg][1] - segs[seg][0] + 1;
      const need = used === 0 ? size : used + 1 + size;
      if (need <= capacity) {
        assignment.push(seg);
        used = need;
        break;
      }
      seg++;
      used = 0;
    }
  }
  return assignment;
}

/**
 * Rung 6 — segment partitioning. Known empty cells cut the line into segments;
 * work out which blocks can go in which segment, and where that assignment is
 * forced, the segment becomes a smaller line to apply overlap within.
 */
export const segmentPartition: LineTechnique = (clues, line) => {
  const real = realClues(clues);
  const segs = segments(line);
  if (real.length === 0 || segs.length <= 1) return null;

  const earliest = earliestAssignment(real, segs);
  const mirrored = earliestAssignment([...real].reverse(), [...segs].reverse());
  if (!earliest || !mirrored) return null;
  const latest = mirrored.reverse().map((s) => segs.length - 1 - s);

  // Only when every block's segment is forced do we know each segment's contents.
  if (!real.every((_size, i) => earliest[i] === latest[i])) return null;

  const cells: DeducedCell[] = [];
  const clueIndices: number[] = [];

  segs.forEach(([a, b], segIndex) => {
    const mine = real.map((size, i) => ({ size, i })).filter(({ i }) => earliest[i] === segIndex);

    if (mine.length === 0) {
      for (let p = a; p <= b; p++) cells.push(clear(p));
      return;
    }

    // Within its own segment, a forced set of blocks is just a smaller line.
    const sub = mine.map((m) => m.size);
    const subLine = line.slice(a, b + 1);
    const found = overlap(sub, subLine) ?? trivialLine(sub, subLine);
    if (found) {
      for (const c of found.cells) cells.push({ index: a + c.index, state: c.state });
      clueIndices.push(...mine.map((m) => m.i));
    }
  });

  return deduction(line, cells, Technique.SegmentPartition, {
    clueIndices: _.uniq(clueIndices),
    description:
      'the empty cells split the line into segments, and each block can only fit in one of them',
  });
};

/**
 * Rung 7 — forced placement, the fallback with no shortcut behind it. Intersect
 * every placement still consistent with the line. This is what solver.ts does
 * for every deduction; here it only runs once every cheaper rung has failed,
 * which is what makes "this puzzle needs full enumeration" a meaningful claim.
 */
export const forcedPlacement: LineTechnique = (clues, line) => {
  const solved = solveArray(clues, line);
  const cells: DeducedCell[] = [];
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== SolverCell.Unknown) continue;
    if (solved[i] === SolverCell.Unknown) continue;
    cells.push({ index: i, state: solved[i] as SolverCell.Filled | SolverCell.Empty });
  }
  return deduction(line, cells, Technique.ForcedPlacement, {
    clueIndices: _.range(realClues(clues).length),
    description: 'every remaining way of placing the blocks agrees about these cells',
  });
};

/**
 * The ladder, cheapest first. Order is the whole point: the solver takes the
 * first rung that produces anything, so a puzzle's technique rating reflects
 * what it actually requires rather than what a strong solver happens to use.
 */
export const LADDER: { technique: Technique; detect: LineTechnique }[] = [
  { technique: Technique.TrivialLine, detect: trivialLine },
  { technique: Technique.Overlap, detect: overlap },
  { technique: Technique.EdgeAnchor, detect: edgeAnchor },
  { technique: Technique.BlockCap, detect: blockCap },
  { technique: Technique.GapTooSmall, detect: gapTooSmall },
  { technique: Technique.Completion, detect: completion },
  { technique: Technique.SegmentPartition, detect: segmentPartition },
  { technique: Technique.ForcedPlacement, detect: forcedPlacement },
];

/** True if the clues can still be placed in the line at all. */
export function hasValidPlacement(clues: number[], line: SolverCell[]): boolean {
  const real = realClues(clues);
  const n = line.length;

  const place = (clueIndex: number, from: number): boolean => {
    if (clueIndex === real.length) {
      for (let i = from; i < n; i++) if (line[i] === SolverCell.Filled) return false;
      return true;
    }
    const size = real[clueIndex];
    const remaining = minSpan(real.slice(clueIndex));

    for (let start = from; start + remaining <= n; start++) {
      // Cells skipped before this block must not be filled.
      if (start > from && line[start - 1] === SolverCell.Filled) return false;
      let fits = true;
      for (let k = 0; k < size; k++) {
        if (line[start + k] === SolverCell.Empty) {
          fits = false;
          break;
        }
      }
      if (!fits) continue;
      const after = start + size;
      if (after < n && line[after] === SolverCell.Filled) continue;
      if (place(clueIndex + 1, after + 1)) return true;
    }
    return false;
  };

  return place(0, 0);
}
