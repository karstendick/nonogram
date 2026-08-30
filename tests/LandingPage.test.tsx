import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LandingPage } from '../src/components/LandingPage';
import { generationService } from '../src/logic/generation/service';
import { DEFAULT_LEVEL_ID, LEVELS } from '../src/logic/generation/levels';
import { useGameStore } from '../src/store/gameStore';
import type { Puzzle } from '../src/types';

function fakePuzzle(id: string): Puzzle {
  return {
    id,
    title: 'Generated 15×15',
    rating: { technique: 60, work: 40, maxTechnique: 6 },
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
    onNavigateToSeedEntry: vi.fn(),
    onNavigateToPremade: vi.fn(),
  };
  render(<LandingPage {...props} />);
  return props;
}

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.setState({ lastLevelId: DEFAULT_LEVEL_ID });
    take.mockResolvedValue({
      puzzle: fakePuzzle('seed-1'),
      rating: { technique: 60, work: 40 } as never,
      inBand: true,
    });
    speculate.mockImplementation(() => {});
  });

  it('should render all three main options', () => {
    renderPage();
    expect(screen.getByText('Quick Play')).toBeInTheDocument();
    expect(screen.getByText('Enter a Seed')).toBeInTheDocument();
    expect(screen.getByText('Pre-made Puzzles')).toBeInTheDocument();
  });

  it('offers a difficulty level for each measured band', () => {
    renderPage();
    expect(screen.getAllByRole('radio')).toHaveLength(LEVELS.length);
  });

  it('starts on the level the player used last', () => {
    useGameStore.setState({ lastLevelId: 4 });
    renderPage();
    expect(screen.getByRole('radio', { name: /Level 4/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('allows changing the level', () => {
    renderPage();
    fireEvent.click(screen.getByRole('radio', { name: /Level 3/ }));
    expect(screen.getByRole('radio', { name: /Level 3/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('speculates on the remembered level so the first puzzle is not a cold start', async () => {
    useGameStore.setState({ lastLevelId: 3 });
    renderPage();
    await waitFor(() => expect(speculate).toHaveBeenCalledWith(3));
  });

  it('re-speculates when the level changes, since the in-flight work is now useless', () => {
    renderPage();
    fireEvent.click(screen.getByRole('radio', { name: /Level 4/ }));
    expect(speculate).toHaveBeenCalledWith(4);
  });

  it('generates and loads a puzzle when Quick Play is clicked', async () => {
    const props = renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Play Random Puzzle/i }));

    await waitFor(() => expect(props.onPuzzleSelected).toHaveBeenCalled());
    expect(props.onPuzzleSelected.mock.calls[0][0].width).toBe(15);
    expect(take).toHaveBeenCalledWith(DEFAULT_LEVEL_ID, expect.any(Function));
  });

  it('requests the selected level', async () => {
    const props = renderPage();
    fireEvent.click(screen.getByRole('radio', { name: /Level 4/ }));
    fireEvent.click(screen.getByRole('button', { name: /Play Random Puzzle/i }));

    await waitFor(() => expect(props.onPuzzleSelected).toHaveBeenCalled());
    expect(take).toHaveBeenCalledWith(4, expect.any(Function));
  });

  it('remembers the level played, so the next session can speculate on it', async () => {
    const props = renderPage();
    fireEvent.click(screen.getByRole('radio', { name: /Level 3/ }));
    fireEvent.click(screen.getByRole('button', { name: /Play Random Puzzle/i }));

    await waitFor(() => expect(props.onPuzzleSelected).toHaveBeenCalled());
    expect(useGameStore.getState().lastLevelId).toBe(3);
  });

  it('shows what the generator is doing while the player waits', async () => {
    let report: ((progress: { stats: unknown }) => void) | undefined;
    take.mockImplementation((_level, onProgress) => {
      report = onProgress as typeof report;
      return new Promise(() => {}); // Never settles: hold the waiting state.
    });

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Play Random Puzzle/i }));

    expect(screen.getByRole('button', { name: /Generating/i })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Level 1/ })).toBeDisabled();

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

  it('navigates to seed entry', () => {
    const props = renderPage();
    fireEvent.click(screen.getByText('Enter a Seed').closest('button')!);
    expect(props.onNavigateToSeedEntry).toHaveBeenCalledTimes(1);
  });

  it('navigates to premade puzzles', () => {
    const props = renderPage();
    fireEvent.click(screen.getByText('Pre-made Puzzles').closest('button')!);
    expect(props.onNavigateToPremade).toHaveBeenCalledTimes(1);
  });
});
