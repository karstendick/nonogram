import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompletionModal } from '../src/components/CompletionModal';
import { useGameStore } from '../src/store/gameStore';
import { generationService } from '../src/logic/generation/service';
import type { Puzzle } from '../src/types';

const makePuzzle = (title: string, size: number, id = 'test-seed'): Puzzle => ({
  id,
  title,
  rating: { maxTechnique: 6, deductions: 90 },
  width: size,
  height: size,
  solution: Array.from({ length: size }, () => Array<boolean>(size).fill(false)),
  rowClues: Array.from({ length: size }, () => [0]),
  columnClues: Array.from({ length: size }, () => [0]),
});

// "Play Another" goes through the generation service, which owns the worker.
const take = vi.spyOn(generationService, 'take');

const completeWith = (puzzle: Puzzle) => {
  useGameStore.setState({ currentPuzzle: puzzle, isComplete: true, moves: 5 });
};

describe('CompletionModal', () => {
  beforeEach(() => {
    take.mockResolvedValue({
      puzzle: makePuzzle('Generated 15×15', 15, 'fresh-seed'),
      rating: { maxTechnique: 6, deductions: 90 } as never,
      inBand: true,
    });
    useGameStore.setState({ currentPuzzle: null, isComplete: false, moves: 0 });
  });

  it('offers to play another puzzle of the same size for generated puzzles', () => {
    completeWith(makePuzzle('Generated 15×15', 15));

    render(
      <CompletionModal
        onBackToSelection={vi.fn()}
        onPlayAnother={vi.fn()}
        onWatchReplay={vi.fn()}
        canWatchReplay={false}
      />
    );

    expect(screen.getByText(/Play Another/)).toBeInTheDocument();
    expect(screen.getByText('Admire Puzzle')).toBeInTheDocument();
    expect(screen.getByText('Back to Puzzle Selection')).toBeInTheDocument();
  });

  it('does not offer to play another puzzle for pre-made puzzles', () => {
    completeWith(makePuzzle('Star', 10));

    render(
      <CompletionModal
        onBackToSelection={vi.fn()}
        onPlayAnother={vi.fn()}
        onWatchReplay={vi.fn()}
        canWatchReplay={false}
      />
    );

    expect(screen.queryByText(/Play Another/)).not.toBeInTheDocument();
    expect(screen.getByText('Admire Puzzle')).toBeInTheDocument();
  });

  it('generates a new puzzle of the same size and hands it back', async () => {
    completeWith(makePuzzle('Generated 10×10', 10));
    useGameStore.setState({ lastLevelId: 3, lastSize: 10 });
    const onPlayAnother = vi.fn();

    render(
      <CompletionModal
        onBackToSelection={vi.fn()}
        onPlayAnother={onPlayAnother}
        onWatchReplay={vi.fn()}
        canWatchReplay={false}
      />
    );

    fireEvent.click(screen.getByText(/Play Another/));

    await waitFor(() => expect(onPlayAnother).toHaveBeenCalledTimes(1));

    // Asks for the size and level last played, and hands back whatever the
    // service had ready — usually a puzzle generated while this one was solved.
    expect(take).toHaveBeenCalledWith(10, 3);
    const newPuzzle = onPlayAnother.mock.calls[0][0] as Puzzle;
    expect(newPuzzle.id).not.toBe('test-seed');
  });

  it('renders nothing until the puzzle is complete', () => {
    useGameStore.setState({ currentPuzzle: makePuzzle('Generated 5×5', 5), isComplete: false });

    const { container } = render(
      <CompletionModal
        onBackToSelection={vi.fn()}
        onPlayAnother={vi.fn()}
        onWatchReplay={vi.fn()}
        canWatchReplay={false}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('hides the modal when admiring the puzzle', () => {
    completeWith(makePuzzle('Generated 5×5', 5));

    const { container } = render(
      <CompletionModal
        onBackToSelection={vi.fn()}
        onPlayAnother={vi.fn()}
        onWatchReplay={vi.fn()}
        canWatchReplay={false}
      />
    );

    fireEvent.click(screen.getByText('Admire Puzzle'));

    expect(container).toBeEmptyDOMElement();
  });

  describe('Watch Again', () => {
    it('offers a replay when there is one to watch', () => {
      completeWith(makePuzzle('Generated 5×5', 5));
      const onWatchReplay = vi.fn();

      render(
        <CompletionModal
          onBackToSelection={vi.fn()}
          onPlayAnother={vi.fn()}
          onWatchReplay={onWatchReplay}
          canWatchReplay
        />
      );

      fireEvent.click(screen.getByText('Watch Again'));

      expect(onWatchReplay).toHaveBeenCalledTimes(1);
    });

    it('hides the button when there is nothing recorded to replay', () => {
      completeWith(makePuzzle('Generated 5×5', 5));

      render(
        <CompletionModal
          onBackToSelection={vi.fn()}
          onPlayAnother={vi.fn()}
          onWatchReplay={vi.fn()}
          canWatchReplay={false}
        />
      );

      expect(screen.queryByText('Watch Again')).not.toBeInTheDocument();
      // The other actions are unaffected
      expect(screen.getByText('Admire Puzzle')).toBeInTheDocument();
      expect(screen.getByText('Back to Puzzle Selection')).toBeInTheDocument();
    });
  });
});
