import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PuzzleCodeEntry } from '../src/components/PuzzleCodeEntry';
import { generatePuzzle } from '../src/logic/puzzleGenerator';
import type { Puzzle } from '../src/types';
import { encodePuzzleCode } from '../src/logic/puzzleCode';

const puzzle = generatePuzzle(5, 'entry-fixture', 1)!;
const code = encodePuzzleCode(puzzle.solution);

function renderEntry() {
  const onPuzzleLoaded = vi.fn<(puzzle: Puzzle) => void>();
  render(<PuzzleCodeEntry onPuzzleLoaded={onPuzzleLoaded} />);
  const card = screen.getByText('Enter a code').closest('button')!;
  return { onPuzzleLoaded, card };
}

describe('PuzzleCodeEntry', () => {
  it('hides the field until asked for it', () => {
    // A bare text box on the landing page invites input from the many players
    // who have no code; it appears only once someone says they have one.
    const { card } = renderEntry();
    expect(card).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Puzzle code')).not.toBeInTheDocument();
  });

  it('reveals and focuses the field, so a paste can follow the click', () => {
    const { card } = renderEntry();
    fireEvent.click(card);

    const input = screen.getByLabelText('Puzzle code');
    expect(card).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveFocus();
  });

  it('collapses again', () => {
    const { card } = renderEntry();
    fireEvent.click(card);
    fireEvent.click(card);
    expect(screen.queryByLabelText('Puzzle code')).not.toBeInTheDocument();
  });

  it('opens the puzzle a code names', () => {
    const { onPuzzleLoaded, card } = renderEntry();
    fireEvent.click(card);
    fireEvent.change(screen.getByLabelText('Puzzle code'), { target: { value: code } });
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }));

    expect(onPuzzleLoaded).toHaveBeenCalledTimes(1);
    expect(onPuzzleLoaded.mock.calls[0][0].solution).toEqual(puzzle.solution);
  });

  it('accepts a whole link, since that is what people paste', () => {
    const { onPuzzleLoaded, card } = renderEntry();
    fireEvent.click(card);
    fireEvent.change(screen.getByLabelText('Puzzle code'), {
      target: { value: `https://karstendick.github.io/nonogram/#${code}` },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }));

    expect(onPuzzleLoaded).toHaveBeenCalledTimes(1);
  });

  it('submits on Enter', () => {
    const { onPuzzleLoaded, card } = renderEntry();
    fireEvent.click(card);
    const input = screen.getByLabelText('Puzzle code');
    fireEvent.change(input, { target: { value: code } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onPuzzleLoaded).toHaveBeenCalledTimes(1);
  });

  it('rejects a code that is not a puzzle, and opens nothing', () => {
    const { onPuzzleLoaded, card } = renderEntry();
    fireEvent.click(card);
    fireEvent.change(screen.getByLabelText('Puzzle code'), { target: { value: 'AAAAAA' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }));

    expect(screen.getByText(/not a valid puzzle code/)).toBeInTheDocument();
    expect(onPuzzleLoaded).not.toHaveBeenCalled();
  });

  it('clears the error once the player edits the code', () => {
    const { card } = renderEntry();
    fireEvent.click(card);
    const input = screen.getByLabelText('Puzzle code');
    fireEvent.change(input, { target: { value: 'AAAAAA' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }));
    expect(screen.getByText(/not a valid puzzle code/)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: code } });
    expect(screen.queryByText(/not a valid puzzle code/)).not.toBeInTheDocument();
  });
});
