import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generationService } from '../src/logic/generation/service';
import * as strategies from '../src/logic/generation/strategies';
import { emptyStats } from '../src/logic/generation/strategy';
import { levelById } from '../src/logic/generation/levels';
import type { Puzzle } from '../src/types';

/**
 * The buffering and speculation behaviour, exercised through the main-thread
 * fallback path (jsdom has no Worker). What is under test is when generation is
 * started, joined, or thrown away — not the generation itself.
 */

function puzzleFor(seed: string): Puzzle {
  return {
    id: seed,
    title: 'Generated 15×15',
    rating: { maxTechnique: 6, deductions: 90 },
    width: 15,
    height: 15,
    solution: [],
    rowClues: [],
    columnClues: [],
  };
}

let calls: { seed: string; target: unknown }[] = [];

beforeEach(() => {
  calls = [];
  generationService.reset();
  vi.spyOn(strategies, 'generateForTarget').mockImplementation((target, seed) => {
    calls.push({ seed, target });
    return {
      puzzle: puzzleFor(seed),
      rating: { maxTechnique: 6, deductions: 90 } as never,
      inBand: true,
      stats: emptyStats(),
    };
  });
});

describe('generationService', () => {
  it('hands out a puzzle when nothing was pre-generated', async () => {
    const result = await generationService.take(15, 2);
    expect(result?.puzzle.title).toContain('Generated');
    expect(calls).toHaveLength(2); // The request, plus the refill behind it.
  });

  it('serves a speculated puzzle without generating again', async () => {
    generationService.speculate(15, 2);
    await Promise.resolve();
    expect(generationService.hasReady(15, 2)).toBe(true);

    const before = calls.length;
    const result = await generationService.take(15, 2);
    expect(result).not.toBeNull();
    // One further call, which is the refill — not a regeneration of what was
    // already sitting ready.
    expect(calls.length).toBe(before + 1);
  });

  it('starts on the next puzzle as soon as one is handed out', async () => {
    await generationService.take(15, 3);
    await Promise.resolve();
    expect(generationService.hasReady(15, 3)).toBe(true);
  });

  it('does not serve a puzzle speculated for a different level', async () => {
    generationService.speculate(15, 1);
    await Promise.resolve();
    expect(generationService.hasReady(15, 1)).toBe(true);
    expect(generationService.hasReady(15, 4)).toBe(false);

    const result = await generationService.take(15, 4);
    expect(result).not.toBeNull();
    const lastTarget = calls[calls.length - 1].target as { rung: number };
    expect(lastTarget.rung).toBe(levelById(4).rung); // Level 4's rung, not level 1's.
  });

  it('does not serve a puzzle speculated for a different size', async () => {
    generationService.speculate(15, 2);
    await Promise.resolve();
    expect(generationService.hasReady(15, 2)).toBe(true);
    // Same difficulty, different grid: not interchangeable.
    expect(generationService.hasReady(5, 2)).toBe(false);

    const result = await generationService.take(5, 2);
    expect(result).not.toBeNull();
    const lastTarget = calls[calls.length - 1].target as { size: number };
    expect(lastTarget.size).toBe(5);
  });

  it('generates at the size it was asked for', async () => {
    await generationService.take(10, 3);
    expect((calls[0].target as { size: number }).size).toBe(10);
  });

  it('does not speculate twice for the same size and level', () => {
    generationService.speculate(15, 2);
    const after = calls.length;
    generationService.speculate(15, 2);
    expect(calls.length).toBe(after);
  });

  it('uses a fresh seed each time, so consecutive puzzles differ', async () => {
    await generationService.take(15, 2);
    await generationService.take(15, 2);
    const seeds = new Set(calls.map((c) => c.seed));
    expect(seeds.size).toBe(calls.length);
  });

  it('reset clears anything buffered', async () => {
    generationService.speculate(15, 2);
    await Promise.resolve();
    generationService.reset();
    expect(generationService.hasReady(15, 2)).toBe(false);
  });
});
