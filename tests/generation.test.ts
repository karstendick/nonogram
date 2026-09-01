import { describe, it, expect } from 'vitest';
import { generateRandomPattern } from '../src/logic/patternGenerator';
import { Candidate, evaluatePattern } from '../src/logic/generation/evaluate';
import { STRATEGIES, g2KnobBiased, g9Opportunistic } from '../src/logic/generation/strategies';
import {
  DEFAULT_OPTIONS,
  DifficultyTarget,
  distanceToTarget,
  emptyStats,
  inTarget,
} from '../src/logic/generation/strategy';
import { bandName, summarize } from '../src/logic/generation/bakeoff';
import { DifficultyRating, Technique } from '../src/logic/difficulty/types';

const easyish: DifficultyTarget = { size: 10, rung: Technique.SegmentPartition };

function rating(maxTechnique: Technique, deductions = 40): DifficultyRating {
  return {
    maxTechnique,
    deductions,
    cellsPerDeduction: 5,
    openingGenerosity: 0.3,
    bottleneckSteps: 0,
    techniqueCounts: {} as DifficultyRating['techniqueCounts'],
  };
}

describe('pattern parameters', () => {
  it('hits the requested fill ratio', () => {
    for (const fillRatio of [0.35, 0.5, 0.65]) {
      const pattern = generateRandomPattern(20, 'fill-test', { fillRatio, smoothingRounds: 1 });
      const filled = pattern.flat().filter(Boolean).length / pattern.flat().length;
      expect(filled).toBeGreaterThan(fillRatio - 0.08);
      expect(filled).toBeLessThan(fillRatio + 0.08);
    }
  });

  it('is reproducible for a seed', () => {
    const params = { fillRatio: 0.5, smoothingRounds: 2 };
    expect(generateRandomPattern(10, 'same', params)).toEqual(
      generateRandomPattern(10, 'same', params)
    );
  });

  it('smoothing makes patterns blobbier', () => {
    const countRuns = (p: boolean[][]) =>
      p.reduce((total, row) => total + row.filter((c, i) => c && !row[i - 1]).length, 0);
    const rough = generateRandomPattern(20, 'blob', { fillRatio: 0.5, smoothingRounds: 0 });
    const smooth = generateRandomPattern(20, 'blob', { fillRatio: 0.5, smoothingRounds: 3 });
    expect(countRuns(smooth)).toBeLessThan(countRuns(rough));
  });
});

describe('target helpers', () => {
  const target: DifficultyTarget = { size: 15, rung: Technique.ForcedPlacement };

  it('recognises a rating at the target rung', () => {
    expect(inTarget(rating(Technique.ForcedPlacement), target)).toBe(true);
    expect(inTarget(rating(Technique.SegmentPartition), target)).toBe(false);
    expect(inTarget(rating(Technique.Depth1Contradiction), target)).toBe(false);
  });

  it('ignores the deduction count, which is reported rather than targeted', () => {
    expect(inTarget(rating(Technique.ForcedPlacement, 60), target)).toBe(true);
    expect(inTarget(rating(Technique.ForcedPlacement, 140), target)).toBe(true);
  });

  it('folds the rungs below completion into the easiest level', () => {
    // They occur in about 1% of puzzles — too rare to hold out for, and a player
    // could not tell them from the level above.
    const easiest: DifficultyTarget = { size: 15, rung: Technique.Completion };
    expect(inTarget(rating(Technique.Overlap), easiest)).toBe(true);
    expect(inTarget(rating(Technique.GapTooSmall), easiest)).toBe(true);
  });

  it('measures distance in rungs, for picking the best near-miss', () => {
    expect(distanceToTarget(rating(Technique.ForcedPlacement), target)).toBe(0);
    expect(distanceToTarget(rating(Technique.SegmentPartition), target)).toBe(1);
    expect(distanceToTarget(rating(Technique.Completion), target)).toBeGreaterThan(
      distanceToTarget(rating(Technique.SegmentPartition), target)
    );
  });
});

describe('candidate evaluation', () => {
  it('rates a solvable pattern on both readings', () => {
    const stats = emptyStats();
    let found: Candidate | null = null;
    for (let i = 0; i < 40 && !found; i++) {
      found = evaluatePattern(
        generateRandomPattern(10, `eval-${i}`, { fillRatio: 0.6, smoothingRounds: 1 }),
        `eval-${i}`,
        DEFAULT_OPTIONS,
        stats
      );
    }
    expect(found).not.toBeNull();
    expect(found!.rating.deductions).toBeGreaterThan(0);
    expect(found!.rating.maxTechnique).toBeGreaterThanOrEqual(0);
    expect(found!.puzzle.rating).toEqual(found!.rating);
    expect(found!.puzzle.solution.length).toBe(10);
  });

  it('rejects degenerate patterns without solving them', () => {
    const stats = emptyStats();
    const allFilled = Array.from({ length: 5 }, () => Array<boolean>(5).fill(true));
    expect(evaluatePattern(allFilled, 'degenerate', DEFAULT_OPTIONS, stats)).toBeNull();
    expect(stats.rejectedDegenerate).toBe(1);
  });

  it('the ambiguity filter never costs a good candidate', () => {
    // Soundness check: whatever the filter accepts or rejects, turning it off
    // must not reveal puzzles that were being wrongly discarded.
    const withFilter = emptyStats();
    const without = emptyStats();
    let acceptedWith = 0;
    let acceptedWithout = 0;
    for (let i = 0; i < 30; i++) {
      const pattern = generateRandomPattern(8, `sound-${i}`, {
        fillRatio: 0.45,
        smoothingRounds: 1,
      });
      if (
        evaluatePattern(
          pattern,
          `s${i}`,
          { ...DEFAULT_OPTIONS, useAmbiguityFilter: true },
          withFilter
        )
      )
        acceptedWith++;
      if (
        evaluatePattern(
          pattern,
          `s${i}`,
          { ...DEFAULT_OPTIONS, useAmbiguityFilter: false },
          without
        )
      )
        acceptedWithout++;
    }
    expect(acceptedWith).toBe(acceptedWithout);
  });
});

describe('strategies', () => {
  it('all five share the interface and return a puzzle', () => {
    for (const { name, run } of STRATEGIES) {
      const result = run(easyish, `iface-${name}`, { budgetMs: 1500 });
      expect(result.puzzle, name).not.toBeNull();
      expect(result.rating, name).not.toBeNull();
      expect(result.stats.candidates, name).toBeGreaterThan(0);
    }
  });

  it('respects the time budget', () => {
    // Unreachable target, so the budget is what stops it.
    const impossible: DifficultyTarget = { size: 10, rung: Technique.Overlap };
    const started = Date.now();
    const result = g2KnobBiased(impossible, 'budget', { budgetMs: 600 });
    const elapsed = Date.now() - started;

    // It ran until the budget was gone rather than giving up early...
    expect(result.stats.elapsedMs).toBeGreaterThanOrEqual(600);
    // ...and stopped near it. The bound is loose on purpose: the real failure
    // this guards against is a single candidate overrunning by tens of
    // seconds, and a tight bound only flakes on a loaded machine.
    expect(elapsed).toBeLessThan(8000);
  }, 20000);

  it('returns the closest candidate rather than nothing when it misses', () => {
    // Unreachable by construction: rungs below completion are folded up to it,
    // so a target below completion can never be matched.
    const impossible: DifficultyTarget = { size: 10, rung: Technique.Overlap };
    const result = g9Opportunistic(impossible, 'near-miss', { budgetMs: 800 });
    expect(result.inBand).toBe(false);
    expect(result.puzzle).not.toBeNull();
    // The reported rating is the puzzle's real one, never the requested level.
    expect(result.rating!.maxTechnique).toBeGreaterThan(Technique.Overlap);
  });

  it('is deterministic for a seed', () => {
    const a = g2KnobBiased(easyish, 'repeat-me', { budgetMs: 1200 });
    const b = g2KnobBiased(easyish, 'repeat-me', { budgetMs: 1200 });
    expect(a.puzzle!.solution).toEqual(b.puzzle!.solution);
    expect(a.rating).toEqual(b.rating);
  });
});

describe('bakeoff reporting', () => {
  it('summarises hit rate and timing spread', () => {
    const trials = [
      { elapsedMs: 100, candidates: 2, inBand: true, deductions: 90 },
      { elapsedMs: 300, candidates: 8, inBand: false, deductions: 40 },
    ].map((t) => ({
      strategy: 'X',
      targetName: 'band',
      maxTechnique: Technique.Overlap,
      openingGenerosity: 0.2,
      ambiguityProofs: 0,
      depth1Solves: 0,
      ...t,
    }));
    const summary = summarize('X', 'band', trials);
    expect(summary.hitRate).toBe(0.5);
    expect(summary.trials).toBe(2);
    expect(summary.p90Ms).toBeGreaterThanOrEqual(summary.medianMs);
  });

  it('names bands by the rung they ask for', () => {
    expect(bandName({ size: 15, rung: Technique.ForcedPlacement })).toBe(
      '15x15 needing forced placement'
    );
  });
});
