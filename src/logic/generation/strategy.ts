import { Puzzle } from '../../types';
import { DifficultyRating, Technique } from '../difficulty/types';

/**
 * The common interface every generation strategy implements.
 *
 * The strategy to use is an open question the spec settles by measurement
 * rather than argument: all five are built, raced against each other, and the
 * winner chosen from the data. That only works if they are swappable, which is
 * what this interface is for. It is also what lets the winner be changed later
 * without touching callers.
 */

/**
 * What to generate: a grid size and the rung the puzzle must top out at.
 *
 * Length is deliberately not part of the target. Constraining it as well was
 * measured and costs an order of magnitude at the hardest rung for a control
 * players could barely feel.
 */
export interface DifficultyTarget {
  size: number;
  rung: Technique;
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
  // Rungs below completion are folded into the easiest level: too rare to hold
  // out for, and indistinguishable to a player from the level above.
  const rung: Technique = Math.max(rating.maxTechnique, Technique.Completion);
  return rung === target.rung;
}

/**
 * How far a rating sits from the target, for picking the best near-miss.
 *
 * When the budget runs out, generation returns its closest candidate and reports
 * that puzzle's actual rating rather than failing empty-handed. Distance is
 * measured in rungs, since that is what the level means.
 */
export function distanceToTarget(rating: DifficultyRating, target: DifficultyTarget): number {
  const rung = Math.max(rating.maxTechnique, Technique.Completion);
  return Math.abs(rung - target.rung);
}
