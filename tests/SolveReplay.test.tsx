import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { SolveReplay } from '../src/components/SolveReplay';
import { useGameStore } from '../src/store/gameStore';
import { REPLAY_TIMING } from '../src/logic/replay';
import type { ReplayMark } from '../src/logic/replay';
import { CellState } from '../src/types';
import type { Puzzle } from '../src/types';

const createTestPuzzle = (): Puzzle => ({
  id: 'test',
  title: 'Test',
  difficulty: 'easy',
  width: 3,
  height: 3,
  solution: [
    [true, true, false],
    [true, false, false],
    [false, false, false],
  ],
  rowClues: [[2], [1], [0]],
  columnClues: [[2], [1], [0]],
});

const SEQUENCE: ReplayMark[] = [
  { row: 0, col: 0, state: CellState.Filled },
  { row: 0, col: 1, state: CellState.Filled },
  { row: 1, col: 0, state: CellState.Filled },
  { row: 2, col: 2, state: CellState.MarkedEmpty },
];

// Count marks currently drawn on the board
const drawnMarks = () =>
  screen
    .getAllByRole('gridcell')
    .filter((cell) => cell.querySelector('div') !== null || cell.textContent === '×').length;

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

// The loop measures from its first animation frame, so allow a frame of slack
// when asserting on how far it has progressed.
const FRAME = 32;

// Let the rAF-driven loop run for a stretch of simulated time
const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

describe('SolveReplay', () => {
  beforeEach(() => {
    useGameStore.getState().loadPuzzle(createTestPuzzle());
    setReducedMotion(false);
    vi.useFakeTimers({
      toFake: [
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'setTimeout',
        'clearTimeout',
        'performance',
        'Date',
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reveals the marks over time and finishes after the hold', () => {
    const onFinished = vi.fn();
    render(
      <SolveReplay
        sequence={SEQUENCE}
        width={3}
        height={3}
        timing={REPLAY_TIMING}
        onFinished={onFinished}
      />
    );

    expect(drawnMarks()).toBe(0);

    // Interval is clamped to the ceiling for a 4-mark sequence
    advance(REPLAY_TIMING.maxIntervalMs * 2 + FRAME);
    expect(drawnMarks()).toBe(2);
    expect(onFinished).not.toHaveBeenCalled();

    advance(REPLAY_TIMING.maxIntervalMs * 2 + FRAME);
    expect(drawnMarks()).toBe(SEQUENCE.length);

    // The finished picture is held before handing off to the modal
    expect(onFinished).not.toHaveBeenCalled();
    advance(REPLAY_TIMING.holdMs);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('finishes early when Skip is pressed', () => {
    const onFinished = vi.fn();
    render(<SolveReplay sequence={SEQUENCE} width={3} height={3} onFinished={onFinished} />);

    advance(REPLAY_TIMING.maxIntervalMs);
    act(() => {
      screen.getByText('Skip').click();
    });

    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('renders a read-only board', () => {
    render(<SolveReplay sequence={SEQUENCE} width={3} height={3} onFinished={vi.fn()} />);

    advance(REPLAY_TIMING.maxIntervalMs * 4);

    // The replay draws its own grid and never touches the player's
    expect(useGameStore.getState().playerGrid[0][0]).toBe(CellState.Empty);
    const cell = screen.getAllByRole('gridcell')[0];
    expect(cell.className).toContain('cursor-default');
  });

  it('honors overridden timing', () => {
    const onFinished = vi.fn();
    render(
      <SolveReplay
        sequence={SEQUENCE}
        width={3}
        height={3}
        timing={{ ...REPLAY_TIMING, totalMs: 80, maxIntervalMs: 20, holdMs: 0 }}
        onFinished={onFinished}
      />
    );

    // Same sequence that took 4 x 120ms above is done in 4 x 20ms
    advance(20 * 4 + FRAME);
    expect(drawnMarks()).toBe(SEQUENCE.length);
    advance(FRAME);
    expect(onFinished).toHaveBeenCalled();
  });

  it('reports finished without rendering when there is nothing to replay', () => {
    const onFinished = vi.fn();
    render(<SolveReplay sequence={[]} width={3} height={3} onFinished={onFinished} />);

    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Skip')).not.toBeInTheDocument();
  });

  it('skips the automatic replay when reduced motion is preferred', () => {
    setReducedMotion(true);
    const onFinished = vi.fn();
    render(<SolveReplay sequence={SEQUENCE} width={3} height={3} onFinished={onFinished} />);

    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Skip')).not.toBeInTheDocument();
  });

  it('still plays when explicitly requested, even with reduced motion', () => {
    setReducedMotion(true);
    const onFinished = vi.fn();
    render(
      <SolveReplay sequence={SEQUENCE} width={3} height={3} forcePlay onFinished={onFinished} />
    );

    expect(onFinished).not.toHaveBeenCalled();
    advance(REPLAY_TIMING.maxIntervalMs * 2 + FRAME);
    expect(drawnMarks()).toBe(2);
  });
});
