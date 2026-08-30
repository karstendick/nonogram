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

const easyish: DifficultyTarget = {
  size: 10,
  technique: { min: 0, max: 100 },
  work: { min: 0, max: 100 },
};

function rating(technique: number, work: number): DifficultyRating {
  return {
    technique,
    work,
    maxTechnique: Technique.Overlap,
    deductions: 10,
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
  it('recognises a rating inside the band', () => {
    const target: DifficultyTarget = {
      size: 15,
      technique: { min: 20, max: 60 },
      work: { min: 10, max: 50 },
    };
    expect(inTarget(rating(40, 30), target)).toBe(true);
    expect(inTarget(rating(70, 30), target)).toBe(false);
    expect(inTarget(rating(40, 80), target)).toBe(false);
  });

  it('scores distance as zero inside the band and grows outside it', () => {
    const target: DifficultyTarget = {
      size: 15,
      technique: { min: 20, max: 60 },
      work: { min: 10, max: 50 },
    };
    expect(distanceToTarget(rating(40, 30), target)).toBe(0);
    expect(distanceToTarget(rating(70, 30), target)).toBeGreaterThan(0);
  });

  it('weights the technique axis more heavily than work', () => {
    // Someone asking for a hard puzzle mostly cares about the reasoning it demands.
    const target: DifficultyTarget = {
      size: 15,
      technique: { min: 20, max: 60 },
      work: { min: 10, max: 50 },
    };
    expect(distanceToTarget(rating(70, 30), target)).toBeGreaterThan(
      distanceToTarget(rating(40, 60), target)
    );
  });
});

describe('candidate evaluation', () => {
  it('rates a solvable pattern on both axes', () => {
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
    expect(found.rating.technique).toBeGreaterThanOrEqual(0);
    expect(found.puzzle.rating).toEqual(found.rating);
    expect(found.puzzle.solution.length).toBe(10);
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
    const impossible: DifficultyTarget = {
      size: 10,
      technique: { min: 101, max: 200 },
      work: { min: 0, max: 100 },
    };
    const started = Date.now();
    g2KnobBiased(impossible, 'budget', { budgetMs: 600 });
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it('returns the closest candidate rather than nothing when it misses', () => {
    const impossible: DifficultyTarget = {
      size: 10,
      technique: { min: 101, max: 200 },
      work: { min: 0, max: 100 },
    };
    const result = g9Opportunistic(impossible, 'near-miss', { budgetMs: 800 });
    expect(result.inBand).toBe(false);
    expect(result.puzzle).not.toBeNull();
    // The reported rating is the puzzle's real one, never the requested band.
    expect(result.rating!.technique).toBeLessThan(101);
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
      { elapsedMs: 100, candidates: 2, inBand: true, technique: 40, work: 30 },
      { elapsedMs: 300, candidates: 8, inBand: false, technique: 10, work: 20 },
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

  it('names bands by their bounds, since the tier names are still deferred', () => {
    expect(bandName({ size: 15, technique: { min: 0, max: 30 }, work: { min: 0, max: 45 } })).toBe(
      'tech 0-30 / work 0-45'
    );
  });
});
