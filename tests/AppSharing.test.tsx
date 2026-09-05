import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App';
import { useGameStore } from '../src/store/gameStore';
import { generatePuzzle } from '../src/logic/puzzleGenerator';
import { decodePuzzleCode, encodePuzzleCode } from '../src/logic/puzzleCode';

/**
 * Opening a shared link, and showing the code for the puzzle you are on.
 */

const shared = generatePuzzle(5, 'shared-fixture', 1)!;
const sharedCode = encodePuzzleCode(shared.solution);

const other = generatePuzzle(5, 'other-fixture', 1)!;

function setHash(hash: string) {
  window.history.replaceState(null, '', hash ? `/#${hash}` : '/');
}

describe('App — sharing', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.setState({ currentPuzzle: null, isComplete: false, playerGrid: [], markLog: [] });
    setHash('');
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
  });

  it('opens the puzzle a link points at', () => {
    setHash(sharedCode);
    render(<App />);

    expect(useGameStore.getState().currentPuzzle?.solution).toEqual(shared.solution);
    expect(screen.queryByText('Quick Play')).not.toBeInTheDocument();
  });

  it('clears the hash once it has been used', () => {
    // Left in place, a reload would re-open the shared puzzle from scratch and
    // throw away the solve in progress on it.
    setHash(sharedCode);
    render(<App />);

    expect(window.location.hash).toBe('');
  });

  it('beats saved progress on a different puzzle', () => {
    // Following a link is an explicit request; resuming is a default.
    useGameStore.getState().loadPuzzle(other);
    setHash(sharedCode);
    render(<App />);

    expect(useGameStore.getState().currentPuzzle?.solution).toEqual(shared.solution);
  });

  it('says so when a link does not name a valid puzzle, rather than showing nothing', () => {
    setHash('AAAAAA'); // Well-formed length, but an empty grid is not a puzzle.
    render(<App />);

    expect(screen.getByText(/does not point at a valid puzzle/)).toBeInTheDocument();
    expect(screen.getByText('Quick Play')).toBeInTheDocument();
  });

  it('shows a code that decodes back to the puzzle on screen', () => {
    // Stronger than matching a string: this catches a display that has drifted
    // from what the encoder produces.
    useGameStore.getState().loadPuzzle(shared);
    render(<App />);

    const button = screen.getAllByRole('button', { name: /Copy link to puzzle/ })[0];
    const shown = button.textContent.replace('Code:', '').replace('📋', '').trim();
    expect(decodePuzzleCode(shown)).toEqual(shared.solution);
  });

  it('shows a code for pre-made puzzles too, not only generated ones', () => {
    useGameStore.getState().loadPuzzle({ ...shared, id: 'cat', title: 'Cat' });
    render(<App />);

    expect(screen.getAllByRole('button', { name: /Copy link to puzzle/ }).length).toBeGreaterThan(
      0
    );
  });
});
