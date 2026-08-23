import { describe, it, expect } from 'vitest';
import {
  encodeMark,
  decodeMark,
  buildReplaySequence,
  buildReplayGrid,
  stepIntervalMs,
  REPLAY_TIMING,
} from '../src/logic/replay';
import { CellState } from '../src/types';

const WIDTH = 3;
const HEIGHT = 3;

// Build a 3x3 grid from a compact literal: '#' filled, 'x' marked empty, '.' empty
const grid = (rows: string[]): CellState[][] =>
  rows.map((row) =>
    [...row].map((ch) =>
      ch === '#' ? CellState.Filled : ch === 'x' ? CellState.MarkedEmpty : CellState.Empty
    )
  );

const fill = (row: number, col: number) => encodeMark(row, col, WIDTH, CellState.Filled);
const cross = (row: number, col: number) => encodeMark(row, col, WIDTH, CellState.MarkedEmpty);

describe('encodeMark / decodeMark', () => {
  it('round-trips a fill', () => {
    expect(decodeMark(encodeMark(2, 1, WIDTH, CellState.Filled), WIDTH)).toEqual({
      row: 2,
      col: 1,
      state: CellState.Filled,
    });
  });

  it('round-trips an X-mark', () => {
    expect(decodeMark(encodeMark(0, 2, WIDTH, CellState.MarkedEmpty), WIDTH)).toEqual({
      row: 0,
      col: 2,
      state: CellState.MarkedEmpty,
    });
  });

  it('distinguishes the two mark kinds for the same cell', () => {
    expect(encodeMark(1, 1, WIDTH, CellState.Filled)).not.toBe(
      encodeMark(1, 1, WIDTH, CellState.MarkedEmpty)
    );
  });
});

describe('buildReplaySequence', () => {
  it('keeps fills and X-marks interleaved in the order they were made', () => {
    const log = [fill(0, 0), cross(0, 1), fill(1, 1), cross(2, 2)];
    const final = grid(['#x.', '.#.', '..x']);

    expect(buildReplaySequence(log, final, WIDTH)).toEqual([
      { row: 0, col: 0, state: CellState.Filled },
      { row: 0, col: 1, state: CellState.MarkedEmpty },
      { row: 1, col: 1, state: CellState.Filled },
      { row: 2, col: 2, state: CellState.MarkedEmpty },
    ]);
  });

  it('drops cells that are empty in the final grid', () => {
    // (1,0) was filled at some point but erased before the end
    const log = [fill(0, 0), fill(1, 0), fill(0, 1)];
    const final = grid(['##.', '...', '...']);

    expect(buildReplaySequence(log, final, WIDTH)).toEqual([
      { row: 0, col: 0, state: CellState.Filled },
      { row: 0, col: 1, state: CellState.Filled },
    ]);
  });

  it('uses the last surviving mark when a cell was marked, erased, and re-marked', () => {
    const log = [fill(0, 0), fill(1, 1), fill(0, 0)];
    const final = grid(['#..', '.#.', '...']);

    // (0,0) replays at its second fill, i.e. after (1,1)
    expect(buildReplaySequence(log, final, WIDTH)).toEqual([
      { row: 1, col: 1, state: CellState.Filled },
      { row: 0, col: 0, state: CellState.Filled },
    ]);
  });

  it('replays a corrected cell once, as the mark that stuck', () => {
    // (0,0) was X-marked first, then corrected to a fill
    const log = [cross(0, 0), fill(1, 1), fill(0, 0)];
    const final = grid(['#..', '.#.', '...']);

    expect(buildReplaySequence(log, final, WIDTH)).toEqual([
      { row: 1, col: 1, state: CellState.Filled },
      { row: 0, col: 0, state: CellState.Filled },
    ]);
  });

  it('covers every non-empty cell of the final grid exactly once', () => {
    const log = [fill(0, 0), cross(0, 1), cross(0, 1), fill(0, 0), cross(1, 2)];
    const final = grid(['#x.', '..x', '...']);

    const sequence = buildReplaySequence(log, final, WIDTH);
    expect(sequence).toHaveLength(3);
    expect(new Set(sequence.map((m) => `${m.row},${m.col}`)).size).toBe(3);
  });

  it('returns nothing for an empty or missing log', () => {
    const final = grid(['#..', '...', '...']);
    expect(buildReplaySequence([], final, WIDTH)).toEqual([]);
    expect(buildReplaySequence(undefined, final, WIDTH)).toEqual([]);
  });
});

describe('buildReplayGrid', () => {
  const sequence = buildReplaySequence(
    [fill(0, 0), cross(0, 1), fill(1, 1)],
    grid(['#x.', '.#.', '...']),
    WIDTH
  );

  it('starts from an empty grid', () => {
    expect(buildReplayGrid(WIDTH, HEIGHT, sequence, 0)).toEqual(grid(['...', '...', '...']));
  });

  it('applies the first n marks', () => {
    expect(buildReplayGrid(WIDTH, HEIGHT, sequence, 2)).toEqual(grid(['#x.', '...', '...']));
  });

  it('ends equal to the final player grid', () => {
    const final = grid(['#x.', '.#.', '...']);
    expect(buildReplayGrid(WIDTH, HEIGHT, sequence, sequence.length)).toEqual(final);
    // Overshooting the end is clamped, not an error
    expect(buildReplayGrid(WIDTH, HEIGHT, sequence, sequence.length + 10)).toEqual(final);
  });
});

describe('stepIntervalMs', () => {
  it('spreads few marks over the target duration, up to the ceiling', () => {
    expect(stepIntervalMs(10)).toBe(REPLAY_TIMING.maxIntervalMs);
  });

  it('derives the interval from the total duration in between', () => {
    expect(stepIntervalMs(100)).toBe(REPLAY_TIMING.totalMs / 100);
  });

  it('clamps to the floor for very many marks', () => {
    expect(stepIntervalMs(100000)).toBe(REPLAY_TIMING.minIntervalMs);
  });

  it('honors overridden timing', () => {
    const timing = { ...REPLAY_TIMING, totalMs: 1000, minIntervalMs: 1, maxIntervalMs: 500 };
    expect(stepIntervalMs(100, timing)).toBe(10);
  });

  it('does not divide by zero for an empty sequence', () => {
    expect(stepIntervalMs(0)).toBe(REPLAY_TIMING.maxIntervalMs);
  });
});
