import { describe, it, expect } from 'vitest';
import { SolverCell } from '../src/types';
import {
  LADDER,
  blockCap,
  completion,
  edgeAnchor,
  forcedPlacement,
  gapTooSmall,
  hasValidPlacement,
  minSpan,
  overlap,
  segmentPartition,
  segments,
  trivialLine,
} from '../src/logic/difficulty/techniques';
import { LineDeduction } from '../src/logic/difficulty/types';

const U = SolverCell.Unknown;
const F = SolverCell.Filled;
const E = SolverCell.Empty;

/** Render a deduction as a line for readable assertions: # filled, . empty, ? untouched. */
function applied(line: SolverCell[], found: LineDeduction | null): string {
  const out = [...line];
  for (const cell of found?.cells ?? []) out[cell.index] = cell.state;
  return out.map((c) => (c === F ? '#' : c === E ? '.' : '?')).join('');
}

/** Parse a line written the same way, for compact fixtures. */
function line(text: string): SolverCell[] {
  return [...text].map((ch) => (ch === '#' ? F : ch === '.' ? E : U));
}

describe('helpers', () => {
  it('minSpan counts blocks plus the gaps between them', () => {
    expect(minSpan([3])).toBe(3);
    expect(minSpan([1, 1])).toBe(3);
    expect(minSpan([2, 3])).toBe(6);
    expect(minSpan([0])).toBe(0);
  });

  it('segments splits a line at known-empty cells only', () => {
    expect(segments(line('##.??.#'))).toEqual([
      [0, 1],
      [3, 4],
      [6, 6],
    ]);
  });
});

describe('rung 0: trivial line', () => {
  it('empties a line with no blocks', () => {
    expect(applied(line('?????'), trivialLine([0], line('?????')))).toBe('.....');
  });

  it('places blocks that exactly fill the line', () => {
    expect(applied(line('?????'), trivialLine([2, 2], line('?????')))).toBe('##.##');
  });

  it('declines when there is slack', () => {
    expect(trivialLine([2], line('?????'))).toBeNull();
  });
});

describe('rung 1: overlap', () => {
  it('fills the cells a long block covers wherever it sits', () => {
    // A 4-block in 5 cells overlaps on the middle 3.
    expect(applied(line('?????'), overlap([4], line('?????')))).toBe('?###?');
  });

  it('is the move that makes a nearly-full row cheap', () => {
    // The seed example from the spec: 14 in a 15-wide row gives 13 cells at once.
    const found = overlap([14], line('?'.repeat(15)));
    expect(found?.cells).toHaveLength(13);
  });

  it('ignores known cells, which is what keeps it context-free', () => {
    // Rung 1 must not use the filled cell; a stronger rung would.
    expect(overlap([1], line('#????'))).toBeNull();
  });

  it('declines when no block is longer than the slack', () => {
    expect(overlap([1, 1], line('?????'))).toBeNull();
  });
});

describe('rung 2: edge anchoring', () => {
  it('anchors the first block against a filled cell at the edge', () => {
    expect(applied(line('#????'), edgeAnchor([2], line('#????')))).toBe('##.??');
  });

  it('anchors past leading empties', () => {
    expect(applied(line('.#???'), edgeAnchor([2], line('.#???')))).toBe('.##.?');
  });

  it('anchors from the right-hand end too', () => {
    expect(applied(line('???#.'), edgeAnchor([2], line('???#.')))).toBe('?.##.');
  });

  it('declines when the first non-empty cell is unknown', () => {
    expect(edgeAnchor([2], line('??#??'))).toBeNull();
  });
});

describe('rung 3: block capping', () => {
  it('seals a run that is already as long as the longest block', () => {
    expect(applied(line('??##??'), blockCap([2, 1], line('??##??')))).toBe('?.##.?');
  });

  it('pins a single block down from the cells it must cover', () => {
    // The only 3-block must cover index 1, so it starts at 0 or 1: index 2 is
    // covered either way, and index 4 is out of reach.
    expect(applied(line('?#???'), blockCap([3], line('?#???')))).toBe('?##?.');
  });

  it('declines when the cells it must cover pin nothing down', () => {
    // A 3-block covering index 2 can start at 0, 1 or 2 — nothing new follows.
    expect(blockCap([3], line('??#??'))).toBeNull();
  });

  it('glues an anchored run out to the smallest block that could hold it', () => {
    // The run cannot grow left past the empty, so its block starts there. Only
    // the 3-block is big enough to hold two cells, so it reaches index 3.
    expect(applied(line('.##??'), blockCap([3, 1], line('.##??')))).toBe('.###.');
  });

  it('will not glue past a block that could still be the smaller one', () => {
    // A single filled cell could be the 1-block, so nothing is forced.
    expect(blockCap([3, 1], line('.#???'))).toBeNull();
  });

  it('seals the end of a glued run when every candidate block is the same size', () => {
    expect(applied(line('.#???'), blockCap([2, 2], line('.#???')))).toBe('.##.?');
  });

  it('glues from the right-hand end too', () => {
    expect(applied(line('???#.'), blockCap([3], line('???#.')))).toBe('.###.');
  });

  it('declines when nothing pins a run down', () => {
    expect(blockCap([3, 1], line('??#??'))).toBeNull();
  });
});

describe('rung 4: gap too small', () => {
  it('empties a gap too short for any remaining block', () => {
    expect(applied(line('?.???'), gapTooSmall([3], line('?.???')))).toBe('..???');
  });

  it('leaves gaps that are big enough alone', () => {
    expect(gapTooSmall([2], line('??.??'))).toBeNull();
  });
});

describe('rung 5: completion', () => {
  it('empties the rest once every block is placed', () => {
    expect(applied(line('##.?????'), completion([2], line('##.?????')))).toBe('##......');
  });

  it('fills the rest when only exactly enough room is left', () => {
    expect(applied(line('..???'), completion([3], line('..???')))).toBe('..###');
  });

  it('declines mid-solve', () => {
    expect(completion([2, 2], line('##???????'))).toBeNull();
  });
});

describe('rung 6: segment partitioning', () => {
  it('applies overlap inside a segment once each block is pinned to one', () => {
    // Two segments of 3. The 3-block can only be the left one and exactly fills
    // it; the 2-block then has one cell of slack in the right segment.
    const l = line('???.???');
    expect(applied(l, segmentPartition([3, 2], l))).toBe('###.?#?');
  });

  it('empties a segment no block can occupy', () => {
    // The single cell is too small for the 2-block, so it must be empty. The
    // 4-wide segment has too much slack to give anything up.
    const l = line('?.????');
    expect(applied(l, segmentPartition([2], l))).toBe('..????');
  });

  it('declines when the assignment is not forced', () => {
    expect(segmentPartition([1], line('??.??'))).toBeNull();
  });
});

describe('rung 7: forced placement', () => {
  it('finds cells no cheaper rung explains', () => {
    // The filled cell must be the 1-block, because the 2-block cannot reach it
    // and still leave room. Only .#.##. and .#..## survive, and they agree on
    // three more cells. No cheaper rung sees this.
    const l = line('?#????');
    for (const rung of LADDER.slice(0, 7)) expect(rung.detect([1, 2], l)).toBeNull();
    expect(applied(l, forcedPlacement([1, 2], l))).toBe('.#.?#?');
  });

  it('agrees with the cheaper rungs when they also fire', () => {
    const l = line('?????');
    expect(applied(l, forcedPlacement([4], l))).toContain('###');
  });
});

describe('hasValidPlacement', () => {
  it('accepts a line that can still be completed', () => {
    expect(hasValidPlacement([2], line('?#???'))).toBe(true);
  });

  it('rejects a line whose filled cells cannot be covered', () => {
    expect(hasValidPlacement([1], line('##???'))).toBe(false);
  });

  it('rejects blocks that no longer fit', () => {
    expect(hasValidPlacement([3], line('.??.?'))).toBe(false);
  });

  it('accepts an empty line with no blocks', () => {
    expect(hasValidPlacement([0], line('.....'))).toBe(true);
  });
});
