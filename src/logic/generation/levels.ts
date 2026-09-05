import { PatternParams } from '../patternGenerator';
import { StoredRating, TECHNIQUE_NAMES, Technique } from '../difficulty/types';

/**
 * The four difficulty levels, one per rung of the technique ladder.
 *
 * Levels are defined by the hardest technique a puzzle requires, and nothing
 * else. That is the measurement, so a level means exactly one thing and can be
 * described in a sentence.
 *
 * Length is reported but not selected. Adding a length band per level was
 * measured (see the spec): it slows the hardest level roughly tenfold, does
 * nothing at the easiest level where the spread is only a few deductions, and
 * makes "longer" at level 1 the same puzzle length as "shorter" at level 3. The
 * deduction count is shown instead, which collects the experience that would
 * justify a length control without guessing at one now.
 *
 * The knob presets come from measuring which pattern shape produces each rung
 * most often, not from guesswork — at each of the three sizes, since they do not
 * transfer between them.

 * Every level is reachable at every size: 12 of 12 trials found one in each of
 * the twelve cells, the slowest taking 580ms against a 5000ms budget. So the
 * size and difficulty controls are independent, with no combination to disable.
 */
export interface DifficultyLevel {
  id: number;
  name: string;
  /** The rung a puzzle at this level must top out at. */
  rung: Technique;
  /** What the player will actually have to do. */
  hint: string;
  /**
   * Pattern shape that produces this rung most often, keyed by grid size.
   *
   * Per size because the knobs do not transfer: the setting that yields
   * contradiction puzzles nearly half the time at 5x5 yields them a quarter of
   * the time at 10x10. Measured with `npm run size-presets`; see
   * docs/specs/seed-sharing-fixes.md for the tables. A size with no entry falls
   * back to 15x15, which only the calibration scripts ever hit.
   */
  params: Partial<Record<number, PatternParams>>;
}

export const LEVELS: DifficultyLevel[] = [
  {
    id: 1,
    name: 'Easy',
    rung: Technique.Completion,
    hint: 'Counting and simple overlaps',
    params: {
      5: { fillRatio: 0.6, smoothingRounds: 2 },
      10: { fillRatio: 0.6, smoothingRounds: 2 },
      15: { fillRatio: 0.6, smoothingRounds: 2 },
    },
  },
  {
    id: 2,
    name: 'Medium',
    rung: Technique.SegmentPartition,
    hint: 'Splitting rows into segments',
    params: {
      5: { fillRatio: 0.5, smoothingRounds: 0 },
      10: { fillRatio: 0.65, smoothingRounds: 0 },
      15: { fillRatio: 0.7, smoothingRounds: 0 },
    },
  },
  {
    id: 3,
    name: 'Hard',
    rung: Technique.ForcedPlacement,
    hint: 'Weighing every way a row could fit',
    params: {
      5: { fillRatio: 0.35, smoothingRounds: 1 },
      10: { fillRatio: 0.5, smoothingRounds: 0 },
      15: { fillRatio: 0.45, smoothingRounds: 1 },
    },
  },
  {
    id: 4,
    name: 'Evil',
    rung: Technique.Depth1Contradiction,
    hint: 'Assume, then prove yourself wrong',
    params: {
      5: { fillRatio: 0.35, smoothingRounds: 2 },
      10: { fillRatio: 0.35, smoothingRounds: 1 },
      15: { fillRatio: 0.35, smoothingRounds: 1 },
    },
  },
];

/** The grid sizes the app generates and the pre-made collection uses. */
export const SIZES = [5, 10, 15] as const;
export type PuzzleSize = (typeof SIZES)[number];

export const DEFAULT_SIZE: PuzzleSize = 15;
export const DEFAULT_LEVEL_ID = 2;

export function levelById(id: number): DifficultyLevel {
  return LEVELS.find((level) => level.id === id) ?? LEVELS[DEFAULT_LEVEL_ID - 1];
}

/**
 * The level a rating belongs to.
 *
 * Rungs below completion are folded into level 1: they occur in about 1% of
 * puzzles, too few to be worth a level of their own.
 */
export function levelForRating(rating: StoredRating): DifficultyLevel {
  const rung: Technique = Math.max(rating.maxTechnique, Technique.Completion);
  return LEVELS.find((level) => level.rung === rung) ?? LEVELS[0];
}

/** How a rating reads to a player: what it demands, and how much of it there is. */
export function describeRating(rating: StoredRating): { technique: string; length: string } {
  return {
    technique: `needs ${TECHNIQUE_NAMES[rating.maxTechnique]}`,
    length: `${rating.deductions} deductions`,
  };
}
