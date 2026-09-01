/// <reference lib="webworker" />
import { generateForTarget } from '../logic/generation/strategies';
import { DifficultyTarget, GenerationStats } from '../logic/generation/strategy';
import type { Puzzle } from '../types';
import type { DifficultyRating } from '../logic/difficulty/types';

/**
 * Puzzle generation, off the main thread.
 *
 * Deliberately a thin shim: every piece of logic lives in plain modules that
 * are unit-tested directly, and this file only moves messages. Workers are
 * awkward to exercise under jsdom, so keeping it this thin is what lets the
 * real work stay tested.
 *
 * A worker rather than a yielding main-thread loop because of background
 * generation: the next puzzle is generated while the player is solving the
 * current one, and this app's core interaction is a touch drag across cells. A
 * single Expert candidate can take a few hundred milliseconds, and a stall that
 * long mid-drag is exactly the jank background generation exists to avoid.
 *
 * Cancellation is by terminate(), not a cooperative flag. A synchronous loop
 * would not see an incoming message anyway, and the only time generation is
 * cancelled is when the player picked a different difficulty — at which point
 * the partial work is for the wrong target and worth nothing.
 */

export interface GenerateRequest {
  type: 'generate';
  target: DifficultyTarget;
  seed: string;
  budgetMs: number;
}

export type GeneratorResponse =
  | { type: 'progress'; stats: GenerationStats }
  | {
      type: 'done';
      puzzle: Puzzle | null;
      rating: DifficultyRating | null;
      inBand: boolean;
      stats: GenerationStats;
    }
  | { type: 'error'; message: string };

const post = (message: GeneratorResponse) => {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);
};

self.onmessage = (event: MessageEvent<GenerateRequest>) => {
  const request = event.data;
  if (request.type !== 'generate') return;

  try {
    const result = generateForTarget(request.target, request.seed, {
      budgetMs: request.budgetMs,
      onProgress: (stats) => post({ type: 'progress', stats: { ...stats } }),
    });
    post({
      type: 'done',
      puzzle: result.puzzle,
      rating: result.rating,
      inBand: result.inBand,
      stats: result.stats,
    });
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : 'Generation failed' });
  }
};
