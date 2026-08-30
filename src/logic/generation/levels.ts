import { DifficultyTarget } from './strategy';
import { DifficultyRating, StoredRating, TECHNIQUE_NAMES } from '../difficulty/types';

/**
 * The difficulty levels the player can ask for.
 *
 * Deliberately numbered rather than named. What the tiers should be called —
 * and how many there should be — is an open question the spec defers until
 * there is real play experience across a spread of scores, on the grounds that
 * naming a tier is a claim about how a puzzle feels. Numbers are ordinal
 * without claiming anything, and shipping them is what generates the
 * experience needed to answer the question properly.
 *
 * The bands come from what `npm run calibrate` measures at 15x15, not from
 * guesswork. Every strategy hit all four in the bake-off.
 */
export interface DifficultyLevel {
  id: number;
  target: DifficultyTarget;
  /** What a player is likely to run into at this level, in plain terms. */
  hint: string;
}

export const LEVELS: DifficultyLevel[] = [
  {
    id: 1,
    target: { size: 15, technique: { min: 0, max: 60 }, work: { min: 0, max: 45 } },
    hint: 'Lots falls out at a glance',
  },
  {
    id: 2,
    target: { size: 15, technique: { min: 40, max: 78 }, work: { min: 30, max: 60 } },
    hint: 'Steady going, few dead ends',
  },
  {
    id: 3,
    target: { size: 15, technique: { min: 60, max: 100 }, work: { min: 50, max: 90 } },
    hint: 'Long, and it makes you work',
  },
  {
    id: 4,
    target: { size: 15, technique: { min: 95, max: 100 }, work: { min: 20, max: 100 } },
    hint: 'Needs reasoning by contradiction',
  },
];

export const DEFAULT_LEVEL_ID = 2;

export function levelById(id: number): DifficultyLevel {
  return LEVELS.find((level) => level.id === id) ?? LEVELS[DEFAULT_LEVEL_ID - 1];
}

/** The level a rating actually landed in, which may not be the one asked for. */
export function levelForRating(rating: DifficultyRating): DifficultyLevel | null {
  return (
    LEVELS.find(
      (level) =>
        rating.technique >= level.target.technique.min &&
        rating.technique <= level.target.technique.max &&
        rating.work >= level.target.work.min &&
        rating.work <= level.target.work.max
    ) ?? null
  );
}

/**
 * How a rating reads to a player. Both axes are shown, because a long grind of
 * obvious moves and a short puzzle with one nasty step are different kinds of
 * hard and one number cannot say which you are looking at.
 */
export function describeRating(rating: StoredRating): { technique: string; work: string } {
  const work = rating.work < 30 ? 'light work' : rating.work < 60 ? 'moderate work' : 'heavy work';
  return { technique: `needs ${TECHNIQUE_NAMES[rating.maxTechnique]}`, work };
}
