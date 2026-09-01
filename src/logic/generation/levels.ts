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
 * most often, not from guesswork.
 */
export interface DifficultyLevel {
  id: number;
  name: string;
  /** The rung a puzzle at this level must top out at. */
  rung: Technique;
  /** What the player will actually have to do. */
  hint: string;
  /** Pattern shape that produces this rung most often. */
  params: PatternParams;
}

export const LEVELS: DifficultyLevel[] = [
  {
    id: 1,
    name: 'Easy',
    rung: Technique.Completion,
    hint: 'Counting and simple overlaps',
    params: { fillRatio: 0.6, smoothingRounds: 2 },
  },
  {
    id: 2,
    name: 'Medium',
    rung: Technique.SegmentPartition,
    hint: 'Splitting rows into segments',
    params: { fillRatio: 0.7, smoothingRounds: 0 },
  },
  {
    id: 3,
    name: 'Hard',
    rung: Technique.ForcedPlacement,
    hint: 'Weighing every way a row could fit',
    params: { fillRatio: 0.45, smoothingRounds: 1 },
  },
  {
    id: 4,
    name: 'Evil',
    rung: Technique.Depth1Contradiction,
    hint: 'Assume, then prove yourself wrong',
    params: { fillRatio: 0.35, smoothingRounds: 1 },
  },
];

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
