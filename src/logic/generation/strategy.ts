import { Puzzle } from '../../types';
import { DifficultyRating } from '../difficulty/types';

/**
 * The common interface every generation strategy implements.
 *
 * The strategy to use is an open question the spec settles by measurement
 * rather than argument: all five are built, raced against each other, and the
 * winner chosen from the data. That only works if they are swappable, which is
 * what this interface is for. It is also what lets the winner be changed later
 * without touching callers.
 */

/** A target region in the two-dimensional technique/work space. */
export interface DifficultyTarget {
  size: number;
  technique: { min: number; max: number };
  work: { min: number; max: number };
}

export interface GenerationStats {
  /** Patterns generated, whether or not they survived. */
  candidates: number;
  rejectedDegenerate: number;
  /** Not solvable by logic alone, at any depth we tried. */
  rejectedUnsolvable: number;
  /** Solvable, but landed outside the target band. */
  rejectedOffTarget: number;
  /** Candidates a sound switching-component proof discarded without a full solve. */
  ambiguityProofs: number;
  depth1Solves: number;
  elapsedMs: number;
}

export interface GenerationResult {
  /** Never null unless nothing solvable was found at all. */
  puzzle: Puzzle | null;
  rating: DifficultyRating | null;
  /** False when the budget ran out and this is the closest candidate found. */
  inBand: boolean;
  stats: GenerationStats;
}

export interface GenerationOptions {
  /** Wall-clock budget in ms. The spec caps a player-visible wait at 10s. */
  budgetMs: number;
  /** Use the sound ambiguity pre-filter before paying for a full solve. */
  useAmbiguityFilter: boolean;
  /** Allow depth-1 search, without which the hardest tier is unreachable. */
  allowDepth1: boolean;
  /**
   * Called as candidates are tried, so a waiting player can be shown what is
   * actually happening rather than a spinner. Generation runs in a worker, so
   * this is what the worker turns into progress messages.
   */
  onProgress?: (stats: GenerationStats) => void;
}

export const DEFAULT_OPTIONS: GenerationOptions = {
  budgetMs: 10000,
  useAmbiguityFilter: true,
  allowDepth1: true,
};

/** How often to report progress, in candidates. */
export const PROGRESS_INTERVAL = 8;

export type GenerationStrategy = (
  target: DifficultyTarget,
  seed: string,
  options?: Partial<GenerationOptions>
) => GenerationResult;

export function emptyStats(): GenerationStats {
  return {
    candidates: 0,
    rejectedDegenerate: 0,
    rejectedUnsolvable: 0,
    rejectedOffTarget: 0,
    ambiguityProofs: 0,
    depth1Solves: 0,
    elapsedMs: 0,
  };
}

export function inTarget(rating: DifficultyRating, target: DifficultyTarget): boolean {
  return (
    rating.technique >= target.technique.min &&
    rating.technique <= target.technique.max &&
    rating.work >= target.work.min &&
    rating.work <= target.work.max
  );
}

/**
 * How far a rating sits from the target, for picking the best near-miss.
 *
 * When the budget runs out, generation returns its closest candidate and
 * reports that puzzle's actual rating rather than failing empty-handed. The
 * technique axis is weighted more heavily because someone who asked for a hard
 * puzzle mostly cares about the reasoning it demands.
 */
export function distanceToTarget(rating: DifficultyRating, target: DifficultyTarget): number {
  const miss = (value: number, band: { min: number; max: number }) =>
    value < band.min ? band.min - value : value > band.max ? value - band.max : 0;
  return 2 * miss(rating.technique, target.technique) + miss(rating.work, target.work);
}
