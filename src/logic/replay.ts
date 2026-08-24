import { CellState } from '../types';

// A single mark in a replay: a cell and the state the player left it in
export interface ReplayMark {
  row: number;
  col: number;
  state: CellState.Filled | CellState.MarkedEmpty;
}

// Timing values that determine how the replay feels. Settled by feel with a
// dev-only slider panel, which was removed once these numbers were locked in.
export interface ReplayTiming {
  totalMs: number; // target duration for the whole replay
  minIntervalMs: number; // floor on the per-mark delay
  maxIntervalMs: number; // ceiling on the per-mark delay
  holdMs: number; // pause on the finished picture before handing off
  fadeMs: number; // how long a single mark takes to fade in
}

export const REPLAY_TIMING: ReplayTiming = {
  totalMs: 10000,
  minIntervalMs: 20,
  maxIntervalMs: 125,
  holdMs: 3000,
  fadeMs: 500,
};

// Marks pack into a single number so the persisted log stays small:
// the cell's flat index, with the low bit recording which kind of mark it is.
export function encodeMark(row: number, col: number, width: number, state: CellState): number {
  return (row * width + col) * 2 + (state === CellState.MarkedEmpty ? 1 : 0);
}

export function decodeMark(encoded: number, width: number): ReplayMark {
  const cellIndex = Math.floor(encoded / 2);
  return {
    row: Math.floor(cellIndex / width),
    col: cellIndex % width,
    state: encoded % 2 === 1 ? CellState.MarkedEmpty : CellState.Filled,
  };
}

/**
 * Turn the raw mark log into the sequence to replay.
 *
 * The log is append-only and can contain a cell more than once (marked, erased,
 * re-marked). Only marks that survived into the final grid are replayed, each at
 * the point the surviving mark was made — so false starts and corrected mistakes
 * drop out, and every non-empty cell appears exactly once.
 */
export function buildReplaySequence(
  markLog: number[] | undefined,
  playerGrid: CellState[][],
  width: number
): ReplayMark[] {
  if (!markLog?.length || !playerGrid.length || width <= 0) return [];

  // cell index -> position in the log of the mark that stuck
  const lastEntryByCell = new Map<number, number>();

  for (let i = 0; i < markLog.length; i++) {
    const { row, col, state } = decodeMark(markLog[i], width);
    if (row >= playerGrid.length || col >= playerGrid[row].length) continue;
    if (playerGrid[row][col] !== state) continue;
    lastEntryByCell.set(row * width + col, i);
  }

  return [...lastEntryByCell.values()]
    .sort((a, b) => a - b)
    .map((logIndex) => decodeMark(markLog[logIndex], width));
}

// The grid as it looks after `step` marks of the sequence have been applied
export function buildReplayGrid(
  width: number,
  height: number,
  sequence: ReplayMark[],
  step: number
): CellState[][] {
  const grid: CellState[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => CellState.Empty)
  );

  const applied = Math.max(0, Math.min(step, sequence.length));
  for (let i = 0; i < applied; i++) {
    const { row, col, state } = sequence[i];
    grid[row][col] = state;
  }

  return grid;
}

/**
 * Delay between marks. Derived from a target total duration rather than fixed
 * per mark, so a 5x5 and a 15x15 take roughly the same time to replay.
 */
export function stepIntervalMs(stepCount: number, timing: ReplayTiming = REPLAY_TIMING): number {
  if (stepCount <= 0) return timing.maxIntervalMs;
  const ideal = timing.totalMs / stepCount;
  return Math.max(timing.minIntervalMs, Math.min(timing.maxIntervalMs, ideal));
}
