import _ from 'lodash';
import seedrandom from 'seedrandom';
import { PatternParams, generateRandomPattern } from '../../patternGenerator';
import { LEVELS } from '../levels';
import { Candidate, drawCandidate, evaluatePattern } from '../evaluate';
import {
  DEFAULT_OPTIONS,
  DifficultyTarget,
  GenerationOptions,
  GenerationResult,
  GenerationStats,
  GenerationStrategy,
  PROGRESS_INTERVAL,
  distanceToTarget,
  emptyStats,
  inTarget,
} from '../strategy';

/**
 * The five candidate generation strategies.
 *
 * Which one is right is an empirical question the spec settles by measurement:
 * every argument for or against one of them is a prediction, so they all get
 * built and raced. They share the interface and the candidate evaluation, so
 * the bake-off compares how they SEARCH and nothing else.
 */

/** The single cheap, high-yield preset G9 samples from without targeting. */
export const OPPORTUNISTIC_PARAMS: PatternParams = { fillRatio: 0.5, smoothingRounds: 2 };

/**
 * The pattern shape that produces the target rung most often at this size,
 * measured rather than guessed. At 15x15 the hit rates are 57% for completion,
 * 90% for segment partitioning, 88% for forced placement and 40% for
 * contradiction; the 5x5 and 10x10 columns are in
 * docs/specs/seed-sharing-fixes.md.
 *
 * Sizes outside the table fall back to the 15x15 shape. Only the calibration
 * scripts ask for those — the app offers exactly the measured sizes.
 */
function presetFor(target: DifficultyTarget): PatternParams {
  const level = LEVELS.find((l) => l.rung === target.rung) ?? LEVELS[0];
  return level.params[target.size] ?? level.params[15]!;
}

/** Tracks the closest candidate seen, so a budget overrun still returns something. */
class BestSoFar {
  private best: Candidate | null = null;
  private bestDistance = Infinity;

  offer(candidate: Candidate, target: DifficultyTarget): boolean {
    const distance = distanceToTarget(candidate.rating, target);
    if (distance < this.bestDistance) {
      this.best = candidate;
      this.bestDistance = distance;
    }
    return distance === 0;
  }

  get value(): Candidate | null {
    return this.best;
  }
}

function finish(
  best: BestSoFar,
  target: DifficultyTarget,
  stats: GenerationStats,
  startedAt: number,
  seed: string
): GenerationResult {
  stats.elapsedMs = Date.now() - startedAt;
  const candidate = best.value;
  return {
    // The puzzle is identified by the seed it was asked for, not by whichever
    // candidate seed happened to win. Puzzles are shared by seed, so this is
    // what makes a shared link reproduce the same puzzle.
    puzzle: candidate ? { ...candidate.puzzle, id: seed } : null,
    rating: candidate?.rating ?? null,
    inBand: candidate ? inTarget(candidate.rating, target) : false,
    stats,
  };
}

function withOptions(options?: Partial<GenerationOptions>): GenerationOptions {
  return { ...DEFAULT_OPTIONS, ...options };
}

/**
 * Sample with a fixed pattern shape until something lands in the band. The
 * baseline: no biasing, no search, just draws.
 */
export const g1RejectionSampling: GenerationStrategy = (target, seed, options) => {
  const opts = withOptions(options);
  const stats = emptyStats();
  const startedAt = Date.now();
  const best = new BestSoFar();

  for (let i = 0; Date.now() - startedAt < opts.budgetMs; i++) {
    const candidate = drawCandidate(target.size, `${seed}-${i}`, undefined, opts, stats);
    if (stats.candidates % PROGRESS_INTERVAL === 0) opts.onProgress?.(stats);
    if (!candidate) continue;
    if (best.offer(candidate, target)) break;
    stats.rejectedOffTarget++;
  }
  return finish(best, target, stats, startedAt, seed);
};

/**
 * Bias the pattern shape toward the target before sampling. Cheaper per hit at
 * the hard end, but it steers a proxy rather than the score itself.
 */
export const g2KnobBiased: GenerationStrategy = (target, seed, options) => {
  const opts = withOptions(options);
  const stats = emptyStats();
  const startedAt = Date.now();
  const best = new BestSoFar();
  const params = presetFor(target);

  for (let i = 0; Date.now() - startedAt < opts.budgetMs; i++) {
    const candidate = drawCandidate(target.size, `${seed}-${i}`, params, opts, stats);
    if (stats.candidates % PROGRESS_INTERVAL === 0) opts.onProgress?.(stats);
    if (!candidate) continue;
    if (best.offer(candidate, target)) break;
    stats.rejectedOffTarget++;
  }
  return finish(best, target, stats, startedAt, seed);
};

/**
 * Hill climb: mutate the best pattern so far and keep changes that move the
 * rating toward the target. Optimises the real score rather than a proxy, at
 * the cost of a full solve per evaluation.
 */
export const g3HillClimbing: GenerationStrategy = (target, seed, options) => {
  const opts = withOptions(options);
  const stats = emptyStats();
  const startedAt = Date.now();
  const best = new BestSoFar();
  // Seeded: the same (seed, size, target) must always produce the same puzzle,
  // or shared seeds stop reproducing.
  const random = seedrandom(`${seed}-climb`);
  const size = target.size;

  let current = generateRandomPattern(size, `${seed}-start`, presetFor(target));
  let currentDistance = Infinity;
  let generation = 0;

  while (Date.now() - startedAt < opts.budgetMs) {
    const candidate = evaluatePattern(current, `${seed}-${generation}`, opts, stats);
    if (stats.candidates % PROGRESS_INTERVAL === 0) opts.onProgress?.(stats);
    if (candidate) {
      const distance = distanceToTarget(candidate.rating, target);
      if (best.offer(candidate, target)) break;
      stats.rejectedOffTarget++;
      if (distance <= currentDistance) currentDistance = distance;
      else current = mutate(current, random, size); // Uphill move rejected; try elsewhere.
    }

    current = mutate(current, random, size);
    generation++;
    if (generation % 200 === 0) {
      // Escape a local optimum the mutations cannot climb out of.
      current = generateRandomPattern(size, `${seed}-restart-${generation}`, presetFor(target));
      currentDistance = Infinity;
    }
  }
  return finish(best, target, stats, startedAt, seed);
};

function mutate(pattern: boolean[][], random: seedrandom.PRNG, size: number): boolean[][] {
  const next = pattern.map((row) => [...row]);
  const pick = () => Math.floor(random() * size);
  const flips = 1 + Math.floor(random() * 3);
  for (let i = 0; i < flips; i++) {
    const r = pick();
    const c = pick();
    next[r][c] = !next[r][c];
  }
  return next;
}

/** Knob-biased sampling first, falling back to hill climbing from its best near-miss. */
export const g5Hybrid: GenerationStrategy = (target, seed, options) => {
  const opts = withOptions(options);
  const half = Math.floor(opts.budgetMs / 2);

  const sampled = g2KnobBiased(target, seed, { ...opts, budgetMs: half });
  if (sampled.inBand) return sampled;

  const climbed = g3HillClimbing(target, `${seed}-climb`, {
    ...opts,
    budgetMs: opts.budgetMs - sampled.stats.elapsedMs,
  });

  // Keep whichever half got closer, and report the combined cost honestly.
  const merged: GenerationStats = {
    candidates: sampled.stats.candidates + climbed.stats.candidates,
    rejectedDegenerate: sampled.stats.rejectedDegenerate + climbed.stats.rejectedDegenerate,
    rejectedUnsolvable: sampled.stats.rejectedUnsolvable + climbed.stats.rejectedUnsolvable,
    rejectedOffTarget: sampled.stats.rejectedOffTarget + climbed.stats.rejectedOffTarget,
    ambiguityProofs: sampled.stats.ambiguityProofs + climbed.stats.ambiguityProofs,
    depth1Solves: sampled.stats.depth1Solves + climbed.stats.depth1Solves,
    elapsedMs: sampled.stats.elapsedMs + climbed.stats.elapsedMs,
  };

  const better =
    climbed.rating && sampled.rating
      ? distanceToTarget(climbed.rating, target) < distanceToTarget(sampled.rating, target)
        ? climbed
        : sampled
      : climbed.rating
        ? climbed
        : sampled;

  return { ...better, stats: merged };
};

/**
 * Do not target at all: sample cheaply from one high-yield preset and take
 * whatever comes out, keeping it if it happens to land in the band. Costs
 * almost nothing per candidate; expected to struggle at the hard end, where the
 * preset simply does not produce what is being asked for.
 */
export const g9Opportunistic: GenerationStrategy = (target, seed, options) => {
  const opts = withOptions(options);
  const stats = emptyStats();
  const startedAt = Date.now();
  const best = new BestSoFar();

  for (let i = 0; Date.now() - startedAt < opts.budgetMs; i++) {
    const candidate = drawCandidate(target.size, `${seed}-${i}`, OPPORTUNISTIC_PARAMS, opts, stats);
    if (stats.candidates % PROGRESS_INTERVAL === 0) opts.onProgress?.(stats);
    if (!candidate) continue;
    if (best.offer(candidate, target)) break;
    stats.rejectedOffTarget++;
  }
  return finish(best, target, stats, startedAt, seed);
};

export const STRATEGIES: { name: string; run: GenerationStrategy }[] = [
  { name: 'G1 rejection', run: g1RejectionSampling },
  { name: 'G2 knob-biased', run: g2KnobBiased },
  { name: 'G3 hill-climb', run: g3HillClimbing },
  { name: 'G5 hybrid', run: g5Hybrid },
  { name: 'G9 opportunistic', run: g9Opportunistic },
];

/**
 * The strategy the app ships with.
 *
 * G2 won the bake-off outright: a 100% hit rate in every band, the fastest or
 * near-fastest time in each, and the fewest candidates burned. G5 is G2 plus a
 * fallback that never fires, G3 was the worst measured, and G9 — a strong
 * second — is better suited to filling buffers in the background than to
 * answering a request for a specific difficulty.
 */
export const generateForTarget: GenerationStrategy = g2KnobBiased;
