import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LandingPage } from '../src/components/LandingPage';
import type { Puzzle } from '../src/types';

// Mock the generatePuzzle function
vi.mock('../src/logic/puzzleGenerator', () => ({
  generatePuzzle: vi.fn((size: number, seed: string) => ({
    id: seed,
    title: `Generated ${size}x${size}`,
    difficulty: 'medium',
    width: size,
    height: size,
    solution: Array(size).fill(Array(size).fill(false)),
    rowClues: Array(size).fill([0]),
    columnClues: Array(size).fill([0]),
  })),
}));

describe('LandingPage', () => {
  it('should render all three main options', () => {
    const mockOnPuzzleSelected = vi.fn();
    const mockOnNavigateToSeedEntry = vi.fn();
    const mockOnNavigateToPremade = vi.fn();

    render(
      <LandingPage
        onPuzzleSelected={mockOnPuzzleSelected}
        onNavigateToSeedEntry={mockOnNavigateToSeedEntry}
        onNavigateToPremade={mockOnNavigateToPremade}
      />
    );

    expect(screen.getByText('Quick Play')).toBeInTheDocument();
    expect(screen.getByText('Enter a Seed')).toBeInTheDocument();
    expect(screen.getByText('Pre-made Puzzles')).toBeInTheDocument();
  });

  it('should default to 15x15 size', () => {
    const mockOnPuzzleSelected = vi.fn();
    const mockOnNavigateToSeedEntry = vi.fn();
    const mockOnNavigateToPremade = vi.fn();

    render(
      <LandingPage
        onPuzzleSelected={mockOnPuzzleSelected}
        onNavigateToSeedEntry={mockOnNavigateToSeedEntry}
        onNavigateToPremade={mockOnNavigateToPremade}
      />
    );

    const radio15 = screen.getByLabelText('15×15');
    expect(radio15.checked).toBe(true);
  });

  it('should allow changing puzzle size', () => {
    const mockOnPuzzleSelected = vi.fn();
    const mockOnNavigateToSeedEntry = vi.fn();
    const mockOnNavigateToPremade = vi.fn();

    render(
      <LandingPage
        onPuzzleSelected={mockOnPuzzleSelected}
        onNavigateToSeedEntry={mockOnNavigateToSeedEntry}
        onNavigateToPremade={mockOnNavigateToPremade}
      />
    );

    const radio10 = screen.getByLabelText('10×10');
    fireEvent.click(radio10);

    expect(radio10.checked).toBe(true);
  });

  it('should generate and load a random puzzle when Quick Play is clicked', async () => {
    const mockOnPuzzleSelected = vi.fn();
    const mockOnNavigateToSeedEntry = vi.fn();
    const mockOnNavigateToPremade = vi.fn();

    render(
      <LandingPage
        onPuzzleSelected={mockOnPuzzleSelected}
        onNavigateToSeedEntry={mockOnNavigateToSeedEntry}
        onNavigateToPremade={mockOnNavigateToPremade}
      />
    );

    const playButton = screen.getByRole('button', { name: /Play Random Puzzle/i });
    fireEvent.click(playButton);

    // Button should show generating state
    expect(screen.getByText('Generating...')).toBeInTheDocument();

    // Wait for puzzle to be generated
    await waitFor(() => {
      expect(mockOnPuzzleSelected).toHaveBeenCalled();
    });

    // Verify a puzzle was passed with expected structure
    const puzzle = mockOnPuzzleSelected.mock.calls[0][0] as Puzzle;
    expect(puzzle).toHaveProperty('id');
    expect(puzzle).toHaveProperty('title');
    expect(puzzle.width).toBe(15); // Default size
    expect(puzzle.height).toBe(15);
  });

  it('should generate puzzle with selected size', async () => {
    const mockOnPuzzleSelected = vi.fn();
    const mockOnNavigateToSeedEntry = vi.fn();
    const mockOnNavigateToPremade = vi.fn();

    render(
      <LandingPage
        onPuzzleSelected={mockOnPuzzleSelected}
        onNavigateToSeedEntry={mockOnNavigateToSeedEntry}
        onNavigateToPremade={mockOnNavigateToPremade}
      />
    );

    // Select 5x5 size
    const radio5 = screen.getByLabelText('5×5');
    fireEvent.click(radio5);

    const playButton = screen.getByRole('button', { name: /Play Random Puzzle/i });
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(mockOnPuzzleSelected).toHaveBeenCalled();
    });

    const puzzle = mockOnPuzzleSelected.mock.calls[0][0] as Puzzle;
    expect(puzzle.width).toBe(5);
    expect(puzzle.height).toBe(5);
  });

  it('should navigate to seed entry when Enter a Seed is clicked', () => {
    const mockOnPuzzleSelected = vi.fn();
    const mockOnNavigateToSeedEntry = vi.fn();
    const mockOnNavigateToPremade = vi.fn();

    render(
      <LandingPage
        onPuzzleSelected={mockOnPuzzleSelected}
        onNavigateToSeedEntry={mockOnNavigateToSeedEntry}
        onNavigateToPremade={mockOnNavigateToPremade}
      />
    );

    const seedButton = screen.getByText('Enter a Seed').closest('button');
    fireEvent.click(seedButton!);

    expect(mockOnNavigateToSeedEntry).toHaveBeenCalledTimes(1);
  });

  it('should navigate to premade puzzles when Pre-made Puzzles is clicked', () => {
    const mockOnPuzzleSelected = vi.fn();
    const mockOnNavigateToSeedEntry = vi.fn();
    const mockOnNavigateToPremade = vi.fn();

    render(
      <LandingPage
        onPuzzleSelected={mockOnPuzzleSelected}
        onNavigateToSeedEntry={mockOnNavigateToSeedEntry}
        onNavigateToPremade={mockOnNavigateToPremade}
      />
    );

    const premadeButton = screen.getByText('Pre-made Puzzles').closest('button');
    fireEvent.click(premadeButton!);

    expect(mockOnNavigateToPremade).toHaveBeenCalledTimes(1);
  });

  it('should disable controls while generating puzzle', async () => {
    const mockOnPuzzleSelected = vi.fn();
    const mockOnNavigateToSeedEntry = vi.fn();
    const mockOnNavigateToPremade = vi.fn();

    render(
      <LandingPage
        onPuzzleSelected={mockOnPuzzleSelected}
        onNavigateToSeedEntry={mockOnNavigateToSeedEntry}
        onNavigateToPremade={mockOnNavigateToPremade}
      />
    );

    const playButton = screen.getByRole('button', { name: /Play Random Puzzle/i });
    fireEvent.click(playButton);

    // Button and size radios should be disabled while generating
    const disabledButton = screen.getByRole('button', { name: /Generating/i });
    expect(disabledButton).toBeDisabled();

    const radio15 = screen.getByLabelText('15×15');
    expect(radio15).toBeDisabled();

    await waitFor(() => {
      expect(mockOnPuzzleSelected).toHaveBeenCalled();
    });
  });
});
