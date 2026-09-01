import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SolveStats } from '../src/components/SolveStats';
import { Technique } from '../src/logic/difficulty/types';

const rating = { maxTechnique: Technique.ForcedPlacement, deductions: 90 };

describe('SolveStats', () => {
  it('shows the move count, the deductions needed, and the ratio between them', () => {
    render(<SolveStats moves={120} rating={rating} />);

    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('allows beating the solver, which is not a bug', () => {
    // One drag along a row can cover ground the solver needed several separate
    // deductions to justify, so over 100% is reachable and worth celebrating
    // rather than clamping away.
    render(<SolveStats moves={60} rating={rating} />);
    expect(screen.getByText('150%')).toBeInTheDocument();
  });

  it('names the hardest technique the puzzle required', () => {
    render(<SolveStats moves={100} rating={rating} />);
    expect(screen.getByText(/forced placement/)).toBeInTheDocument();
  });

  it('falls back to the plain message when a puzzle has no rating', () => {
    // Puzzles saved before ratings existed, and any future puzzle that somehow
    // arrives unrated, must not break the completion screen.
    render(<SolveStats moves={42} />);
    expect(screen.getByText(/solved the puzzle in 42 moves/)).toBeInTheDocument();
    expect(screen.queryByText(/Efficiency/)).not.toBeInTheDocument();
  });

  it('gets the singular right', () => {
    render(<SolveStats moves={1} />);
    expect(screen.getByText(/in 1 move\./)).toBeInTheDocument();
  });
});
