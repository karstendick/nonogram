import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompletionModal } from '../src/components/CompletionModal';
import { useGameStore } from '../src/store/gameStore';
import type { Puzzle } from '../src/types';

// Mock the generator so tests don't run the real solver
vi.mock('../src/logic/puzzleGenerator', () => ({
  generatePuzzle: vi.fn((size: number, seed: string) => ({
    id: seed,
    title: `Generated ${size}×${size}`,
    difficulty: 'medium',
    width: size,
    height: size,
    solution: Array.from({ length: size }, () => Array<boolean>(size).fill(false)),
    rowClues: Array.from({ length: size }, () => [0]),
    columnClues: Array.from({ length: size }, () => [0]),
  })),
}));

const makePuzzle = (title: string, size: number): Puzzle => ({
  id: 'test-seed',
  title,
  difficulty: 'easy',
  width: size,
  height: size,
  solution: Array.from({ length: size }, () => Array<boolean>(size).fill(false)),
  rowClues: Array.from({ length: size }, () => [0]),
  columnClues: Array.from({ length: size }, () => [0]),
});

const completeWith = (puzzle: Puzzle) => {
  useGameStore.setState({ currentPuzzle: puzzle, isComplete: true, moves: 5 });
};

describe('CompletionModal', () => {
  beforeEach(() => {
    useGameStore.setState({ currentPuzzle: null, isComplete: false, moves: 0 });
  });

  it('offers to play another puzzle of the same size for generated puzzles', () => {
    completeWith(makePuzzle('Generated 15×15', 15));

    render(<CompletionModal onBackToSelection={vi.fn()} onPlayAnother={vi.fn()} />);

    expect(screen.getByText('Play Another 15×15')).toBeInTheDocument();
    expect(screen.getByText('Admire Puzzle')).toBeInTheDocument();
    expect(screen.getByText('Back to Puzzle Selection')).toBeInTheDocument();
  });

  it('does not offer to play another puzzle for pre-made puzzles', () => {
    completeWith(makePuzzle('Heart', 7));

    render(<CompletionModal onBackToSelection={vi.fn()} onPlayAnother={vi.fn()} />);

    expect(screen.queryByText(/Play Another/)).not.toBeInTheDocument();
    expect(screen.getByText('Admire Puzzle')).toBeInTheDocument();
  });

  it('generates a new puzzle of the same size and hands it back', async () => {
    completeWith(makePuzzle('Generated 10×10', 10));
    const onPlayAnother = vi.fn();

    render(<CompletionModal onBackToSelection={vi.fn()} onPlayAnother={onPlayAnother} />);

    fireEvent.click(screen.getByText('Play Another 10×10'));

    // Shows progress while the (synchronous, potentially slow) generator runs
    expect(screen.getByText('Generating...')).toBeInTheDocument();

    await waitFor(() => expect(onPlayAnother).toHaveBeenCalledTimes(1));

    const newPuzzle = onPlayAnother.mock.calls[0][0] as Puzzle;
    expect(newPuzzle.width).toBe(10);
    expect(newPuzzle.height).toBe(10);
    // A fresh random seed, not the seed of the puzzle just solved
    expect(newPuzzle.id).not.toBe('test-seed');
  });

  it('renders nothing until the puzzle is complete', () => {
    useGameStore.setState({ currentPuzzle: makePuzzle('Generated 5×5', 5), isComplete: false });

    const { container } = render(
      <CompletionModal onBackToSelection={vi.fn()} onPlayAnother={vi.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('hides the modal when admiring the puzzle', () => {
    completeWith(makePuzzle('Generated 5×5', 5));

    const { container } = render(
      <CompletionModal onBackToSelection={vi.fn()} onPlayAnother={vi.fn()} />
    );

    fireEvent.click(screen.getByText('Admire Puzzle'));

    expect(container).toBeEmptyDOMElement();
  });
});
