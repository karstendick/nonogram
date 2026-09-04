import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import App from '../src/App';
import { useGameStore } from '../src/store/gameStore';
import { CellState } from '../src/types';
import { Technique } from '../src/logic/difficulty/types';
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

// Solve the loaded puzzle through the store, the way the player would
const solvePuzzle = () => {
  act(() => {
    useGameStore.getState().setCellState(0, 0, CellState.Filled);
    useGameStore.getState().setCellState(0, 1, CellState.Filled);
    useGameStore.getState().setCellState(2, 2, CellState.MarkedEmpty);
    useGameStore.getState().setCellState(1, 0, CellState.Filled);
  });
};

describe('App - solve replay', () => {
  beforeEach(() => {
    localStorage.clear();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    useGameStore.getState().loadPuzzle(createTestPuzzle());
  });

  it('replays the solve before showing the completion modal', () => {
    render(<App />);

    solvePuzzle();

    // The replay holds the modal back
    expect(screen.getByText('Replaying your solve…')).toBeInTheDocument();
    expect(screen.queryByText('Puzzle Complete!')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Skip'));

    expect(screen.getByText('Puzzle Complete!')).toBeInTheDocument();
    expect(screen.queryByText('Replaying your solve…')).not.toBeInTheDocument();
  });

  it('replays again on demand, then brings the modal back', () => {
    render(<App />);
    solvePuzzle();
    fireEvent.click(screen.getByText('Skip'));

    fireEvent.click(screen.getByText('Watch Again'));

    expect(screen.getByText('Replaying your solve…')).toBeInTheDocument();
    expect(screen.queryByText('Puzzle Complete!')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Skip'));

    expect(screen.getByText('Puzzle Complete!')).toBeInTheDocument();
  });

  it('does not replay a puzzle that was already complete when the app loaded', () => {
    solvePuzzle();

    render(<App />);

    expect(screen.queryByText('Replaying your solve…')).not.toBeInTheDocument();
  });
});

describe('App - difficulty in the header', () => {
  const createRatedPuzzle = (): Puzzle => ({
    ...createTestPuzzle(),
    rating: { maxTechnique: Technique.Depth1Contradiction, deductions: 115 },
  });

  beforeEach(() => {
    localStorage.clear();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    useGameStore.getState().loadPuzzle(createRatedPuzzle());
  });

  // Both headers are in the DOM at once; CSS hides one, and jsdom applies none
  it('does not give away the technique or the deduction count while playing', () => {
    render(<App />);

    expect(screen.getAllByLabelText('Difficulty: Evil').length).toBeGreaterThan(0);
    expect(screen.queryByText(/deductions/)).not.toBeInTheDocument();
    expect(screen.queryByText(/contradiction/)).not.toBeInTheDocument();
  });

  // The rating comes back as the replay starts, which is after the puzzle is solved
  it('shows the full rating once the puzzle is solved', () => {
    render(<App />);

    solvePuzzle();

    expect(
      screen.getAllByLabelText(/^Difficulty: needs contradiction, 115 deductions$/).length
    ).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Difficulty: Evil')).not.toBeInTheDocument();
  });
});
