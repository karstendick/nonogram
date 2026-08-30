import { STRATEGIES } from './strategies';
import { DifficultyTarget, GenerationOptions } from './strategy';
import { Technique } from '../difficulty/types';

/**
 * The bake-off: race every strategy against every target and report what
 * happened.
 *
 * This is an experiment, not a test. It runs to produce a decision — which
 * strategy to ship — and again whenever the scoring function or the pattern
 * generator changes. Its assertions live elsewhere; what it emits is data.
 */

export interface TrialResult {
  strategy: string;
  targetName: string;
  inBand: boolean;
  elapsedMs: number;
  candidates: number;
  technique: number | null;
  work: number | null;
  maxTechnique: Technique | null;
  openingGenerosity: number | null;
  ambiguityProofs: number;
  depth1Solves: number;
}

export interface Summary {
  strategy: string;
  targetName: string;
  trials: number;
  hitRate: number;
  medianMs: number;
  p90Ms: number;
  p99Ms: number;
  medianCandidates: number;
  /** Where the ratings actually landed, which a hit rate alone hides. */
  techniqueSpread: [number, number];
  workSpread: [number, number];
  /** Distinct patterns produced, as a rough proxy for variety. */
  distinctTechniques: number;
  ambiguityProofRate: number;
  depth1Rate: number;
}

/**
 * Target bands over the two axes.
 *
 * Cut from what `npm run calibrate` actually measures at 15x15 — technique
 * spanning 36 to 100 with a median of 78, work spanning 15 to 86 — rather than
 * guessed. Bands set by guesswork made the first bake-off measure nothing but
 * their own unreachability.
 *
 * Deliberately unnamed: what the tiers should be called is deferred until there
 * is real play experience across a spread of scores, and nothing here needs
 * names to work.
 */
export const BANDS: DifficultyTarget[] = [
  { size: 15, technique: { min: 0, max: 60 }, work: { min: 0, max: 45 } },
  { size: 15, technique: { min: 40, max: 78 }, work: { min: 30, max: 60 } },
  { size: 15, technique: { min: 60, max: 100 }, work: { min: 50, max: 90 } },
  { size: 15, technique: { min: 95, max: 100 }, work: { min: 20, max: 100 } },
];

export function bandName(target: DifficultyTarget): string {
  return `tech ${target.technique.min}-${target.technique.max} / work ${target.work.min}-${target.work.max}`;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

export function summarize(strategy: string, targetName: string, trials: TrialResult[]): Summary {
  const times = trials.map((t) => t.elapsedMs).sort((a, b) => a - b);
  const candidates = trials.map((t) => t.candidates).sort((a, b) => a - b);
  const hits = trials.filter((t) => t.inBand);
  const techniques = hits.map((t) => t.technique ?? 0);
  const works = hits.map((t) => t.work ?? 0);

  return {
    strategy,
    targetName,
    trials: trials.length,
    hitRate: trials.length > 0 ? hits.length / trials.length : 0,
    medianMs: quantile(times, 0.5),
    p90Ms: quantile(times, 0.9),
    p99Ms: quantile(times, 0.99),
    medianCandidates: quantile(candidates, 0.5),
    techniqueSpread:
      techniques.length > 0 ? [Math.min(...techniques), Math.max(...techniques)] : [0, 0],
    workSpread: works.length > 0 ? [Math.min(...works), Math.max(...works)] : [0, 0],
    distinctTechniques: new Set(hits.map((t) => t.maxTechnique)).size,
    ambiguityProofRate:
      trials.reduce((a, t) => a + t.ambiguityProofs, 0) /
      Math.max(
        1,
        trials.reduce((a, t) => a + t.candidates, 0)
      ),
    depth1Rate: hits.length > 0 ? hits.filter((t) => t.depth1Solves > 0).length / hits.length : 0,
  };
}

export interface BakeoffOptions {
  trialsPerCell: number;
  seedPrefix: string;
  generation?: Partial<GenerationOptions>;
  onTrial?: (result: TrialResult) => void;
}

export function runBakeoff(
  targets: DifficultyTarget[],
  options: BakeoffOptions
): { trials: TrialResult[]; summaries: Summary[] } {
  const trials: TrialResult[] = [];
  const summaries: Summary[] = [];

  for (const target of targets) {
    const targetName = bandName(target);
    for (const { name, run } of STRATEGIES) {
      const cell: TrialResult[] = [];
      for (let i = 0; i < options.trialsPerCell; i++) {
        const result = run(
          target,
          `${options.seedPrefix}-${targetName}-${name}-${i}`,
          options.generation
        );
        const trial: TrialResult = {
          strategy: name,
          targetName,
          inBand: result.inBand,
          elapsedMs: result.stats.elapsedMs,
          candidates: result.stats.candidates,
          technique: result.rating?.technique ?? null,
          work: result.rating?.work ?? null,
          maxTechnique: result.rating?.maxTechnique ?? null,
          openingGenerosity: result.rating?.openingGenerosity ?? null,
          ambiguityProofs: result.stats.ambiguityProofs,
          depth1Solves: result.stats.depth1Solves,
        };
        cell.push(trial);
        trials.push(trial);
        options.onTrial?.(trial);
      }
      summaries.push(summarize(name, targetName, cell));
    }
  }

  return { trials, summaries };
}
