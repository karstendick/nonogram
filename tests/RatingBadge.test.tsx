import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RatingBadge } from '../src/components/RatingBadge';
import { Technique } from '../src/logic/difficulty/types';

const rating = { maxTechnique: Technique.Depth1Contradiction, deductions: 115 };

describe('RatingBadge', () => {
  it('shows both readings of the measurement when revealing', () => {
    render(<RatingBadge rating={rating} />);

    expect(
      screen.getByLabelText(/^Difficulty: needs contradiction, 115 deductions$/)
    ).toBeVisible();
  });

  // Naming the technique tells the player what to look for, and the deduction
  // count says how much of the puzzle is left. Both wait for the solve.
  it('shows only the level name when not revealing', () => {
    render(<RatingBadge rating={rating} reveal={false} />);

    expect(screen.getByLabelText('Difficulty: Evil')).toBeVisible();
    expect(screen.queryByText(/deductions/)).not.toBeInTheDocument();
    expect(screen.queryByText(/contradiction/)).not.toBeInTheDocument();
  });

  it('names a level for a rating below the easiest rung', () => {
    // levelForRating folds the rungs under Completion into Easy, so an
    // unrevealed badge never comes out blank
    render(
      <RatingBadge rating={{ maxTechnique: Technique.Overlap, deductions: 40 }} reveal={false} />
    );

    expect(screen.getByLabelText('Difficulty: Easy')).toBeVisible();
  });

  it('renders nothing without a rating', () => {
    const { container } = render(<RatingBadge reveal={false} />);

    expect(container).toBeEmptyDOMElement();
  });
});
