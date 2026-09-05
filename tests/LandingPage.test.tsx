import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { LandingPage } from '../src/components/LandingPage';
import { generationService } from '../src/logic/generation/service';
import { DEFAULT_LEVEL_ID, DEFAULT_SIZE, LEVELS, SIZES } from '../src/logic/generation/levels';
import { useGameStore } from '../src/store/gameStore';
import type { Puzzle } from '../src/types';

function fakePuzzle(id: string): Puzzle {
  return {
    id,
    title: 'Generated 15×15',
    rating: { maxTechnique: 6, deductions: 90 },
    width: 15,
    height: 15,
    solution: Array.from({ length: 15 }, () => Array<boolean>(15).fill(false)),
    rowClues: Array.from({ length: 15 }, () => [0]),
    columnClues: Array.from({ length: 15 }, () => [0]),
  };
}

// The service owns a worker; the component's job is to drive it and show what
// it reports, so that is what these tests exercise.
const take = vi.spyOn(generationService, 'take');
const speculate = vi.spyOn(generationService, 'speculate');

function renderPage() {
  const props = {
    onPuzzleSelected: vi.fn<(puzzle: Puzzle) => void>(),
    onNavigateToPremade: vi.fn(),
  };
  render(<LandingPage {...props} />);
  return props;
}

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.setState({ lastLevelId: DEFAULT_LEVEL_ID, lastSize: DEFAULT_SIZE });
    take.mockResolvedValue({
      puzzle: fakePuzzle('seed-1'),
      rating: { maxTechnique: 6, deductions: 90 } as never,
      inBand: true,
    });
    speculate.mockImplementation(() => {});
  });

  it('should render all three main options', () => {
    renderPage();
    expect(screen.getByText('Quick Play')).toBeInTheDocument();
    expect(screen.getByText('Enter a code')).toBeInTheDocument();
    expect(screen.getByText('Pre-made Puzzles')).toBeInTheDocument();
  });

  it('offers a difficulty level for each measured band', () => {
    renderPage();
    const group = screen.getByRole('radiogroup', { name: 'Difficulty' });
    expect(within(group).getAllByRole('radio')).toHaveLength(LEVELS.length);
  });

  it('offers every calibrated size, all of them at every difficulty', () => {
    renderPage();
    const group = screen.getByRole('radiogroup', { name: 'Size' });
    const options = within(group).getAllByRole('radio');
    expect(options).toHaveLength(SIZES.length);
    // Measured: every level is reachable at every size, so nothing is disabled.
    options.forEach((option) => expect(option).not.toBeDisabled());
  });

  it('starts on the size the player used last', () => {
    useGameStore.setState({ lastSize: 5 });
    renderPage();
    expect(screen.getByRole('radio', { name: '5 by 5' })).toHaveAttribute('aria-checked', 'true');
  });

  it('starts on the level the player used last', () => {
    useGameStore.setState({ lastLevelId: 4 });
    renderPage();
    expect(screen.getByRole('radio', { name: /Evil/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('allows changing the level', () => {
    renderPage();
    fireEvent.click(screen.getByRole('radio', { name: /Hard/ }));
    expect(screen.getByRole('radio', { name: /Hard/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('speculates on the remembered level so the first puzzle is not a cold start', async () => {
    useGameStore.setState({ lastLevelId: 3 });
    renderPage();
    await waitFor(() => expect(speculate).toHaveBeenCalledWith(DEFAULT_SIZE, 3));
  });

  it('re-speculates when the level changes, since the in-flight work is now useless', () => {
    renderPage();
    fireEvent.click(screen.getByRole('radio', { name: /Evil/ }));
    expect(speculate).toHaveBeenCalledWith(DEFAULT_SIZE, 4);
  });

  it('re-speculates when the size changes too', () => {
    renderPage();
    fireEvent.click(screen.getByRole('radio', { name: '5 by 5' }));
    expect(speculate).toHaveBeenCalledWith(5, DEFAULT_LEVEL_ID);
  });

  it('generates and loads a puzzle when Quick Play is clicked', async () => {
    const props = renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Play Random Puzzle/i }));

    await waitFor(() => expect(props.onPuzzleSelected).toHaveBeenCalled());
    expect(props.onPuzzleSelected.mock.calls[0][0].width).toBe(15);
    expect(take).toHaveBeenCalledWith(DEFAULT_SIZE, DEFAULT_LEVEL_ID, expect.any(Function));
  });

  it('requests the selected level', async () => {
    const props = renderPage();
    fireEvent.click(screen.getByRole('radio', { name: /Evil/ }));
    fireEvent.click(screen.getByRole('button', { name: /Play Random Puzzle/i }));

    await waitFor(() => expect(props.onPuzzleSelected).toHaveBeenCalled());
    expect(take).toHaveBeenCalledWith(DEFAULT_SIZE, 4, expect.any(Function));
  });

  it('requests the selected size', async () => {
    const props = renderPage();
    fireEvent.click(screen.getByRole('radio', { name: '10 by 10' }));
    fireEvent.click(screen.getByRole('button', { name: /Play Random Puzzle/i }));

    await waitFor(() => expect(props.onPuzzleSelected).toHaveBeenCalled());
    expect(take).toHaveBeenCalledWith(10, DEFAULT_LEVEL_ID, expect.any(Function));
  });

  it('remembers the size played, so the next session can speculate on it', async () => {
    const props = renderPage();
    fireEvent.click(screen.getByRole('radio', { name: '5 by 5' }));
    fireEvent.click(screen.getByRole('button', { name: /Play Random Puzzle/i }));

    await waitFor(() => expect(props.onPuzzleSelected).toHaveBeenCalled());
    expect(useGameStore.getState().lastSize).toBe(5);
  });

  it('says which level it settled for when the budget ran out', async () => {
    // Asked for Evil, generation could only reach a completion-rung puzzle.
    take.mockResolvedValue({
      puzzle: fakePuzzle('near-miss'),
      rating: { maxTechnique: 3, deductions: 40 } as never,
      inBand: false,
    });
    const props = renderPage();
    fireEvent.click(screen.getByRole('radio', { name: /Evil/ }));
    fireEvent.click(screen.getByRole('button', { name: /Play Random Puzzle/i }));

    await waitFor(() => expect(props.onPuzzleSelected).toHaveBeenCalled());
    expect(screen.getByText(/this one is Easy/)).toBeInTheDocument();
  });

  it('remembers the level played, so the next session can speculate on it', async () => {
    const props = renderPage();
    fireEvent.click(screen.getByRole('radio', { name: /Hard/ }));
    fireEvent.click(screen.getByRole('button', { name: /Play Random Puzzle/i }));

    await waitFor(() => expect(props.onPuzzleSelected).toHaveBeenCalled());
    expect(useGameStore.getState().lastLevelId).toBe(3);
  });

  it('shows what the generator is doing while the player waits', async () => {
    let report: ((progress: { stats: unknown }) => void) | undefined;
    take.mockImplementation((_size, _level, onProgress) => {
      report = onProgress as typeof report;
      return new Promise(() => {}); // Never settles: hold the waiting state.
    });

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Play Random Puzzle/i }));

    expect(screen.getByRole('button', { name: /Generating/i })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Easy/ })).toBeDisabled();

    report?.({
      stats: { candidates: 12, rejectedUnsolvable: 5, rejectedDegenerate: 0, ambiguityProofs: 3 },
    });
    await waitFor(() => expect(screen.getByText(/12 tried/)).toBeInTheDocument());
    expect(screen.getByText(/3 had two solutions/)).toBeInTheDocument();
  });

  it('says so when nothing could be generated', async () => {
    take.mockResolvedValue(null);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Play Random Puzzle/i }));

    await waitFor(() => expect(screen.getByText(/Could not find a puzzle/)).toBeInTheDocument());
  });

  it('reveals the code field in place rather than navigating', () => {
    renderPage();
    const card = screen.getByText('Enter a code').closest('button')!;
    expect(card).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Puzzle code')).not.toBeInTheDocument();

    fireEvent.click(card);
    expect(card).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Puzzle code')).toBeInTheDocument();
  });

  it('navigates to premade puzzles', () => {
    const props = renderPage();
    fireEvent.click(screen.getByText('Pre-made Puzzles').closest('button')!);
    expect(props.onNavigateToPremade).toHaveBeenCalledTimes(1);
  });
});
