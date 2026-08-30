import type { Puzzle } from '../../types';
import type { DifficultyRating } from '../difficulty/types';
import type { GenerateRequest, GeneratorResponse } from '../../workers/generator.worker';
import { DifficultyLevel, levelById } from './levels';
import { GenerationStats } from './strategy';
import { generateForTarget } from './strategies';

/**
 * Generating puzzles without anyone waiting for it.
 *
 * Three things stack up here:
 *
 * - Generation runs in a worker, so the board stays responsive while it works.
 * - Once a puzzle is handed out, the next one for the same level starts
 *   generating immediately, so from the second puzzle onward there is no wait
 *   at all. The buffer is refilled by the live generator, so the supply of
 *   puzzles stays endless — a shipped bank of puzzles would eventually run out,
 *   which is the one thing this must never do.
 * - That only helps from the second puzzle, so the first is covered by starting
 *   a speculative generation while the player is still on the landing page.
 */

export interface GeneratedPuzzle {
  puzzle: Puzzle;
  rating: DifficultyRating;
  /** False when the budget ran out and this is the nearest miss. */
  inBand: boolean;
}

export interface GenerationProgress {
  stats: GenerationStats;
}

const BUDGET_MS = 10000;

function randomSeed(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** A generation in flight, cancellable by terminating its worker. */
interface Job {
  levelId: number;
  seed: string;
  promise: Promise<GeneratedPuzzle | null>;
  cancel: () => void;
}

function supportsWorkers(): boolean {
  return typeof Worker !== 'undefined';
}

/**
 * Run one generation in a worker.
 *
 * Falls back to the main thread where workers are unavailable (notably jsdom
 * under test). The fallback blocks, which is exactly what the worker exists to
 * avoid, so it is a correctness fallback and not a supported path.
 */
function startJob(
  level: DifficultyLevel,
  seed: string,
  onProgress?: (progress: GenerationProgress) => void
): Job {
  if (!supportsWorkers()) {
    const result = generateForTarget(level.target, seed, { budgetMs: BUDGET_MS });
    return {
      levelId: level.id,
      seed,
      promise: Promise.resolve(
        result.puzzle && result.rating
          ? { puzzle: result.puzzle, rating: result.rating, inBand: result.inBand }
          : null
      ),
      cancel: () => {},
    };
  }

  const worker = new Worker(new URL('../../workers/generator.worker.ts', import.meta.url), {
    type: 'module',
  });

  let settle: (value: GeneratedPuzzle | null) => void = () => {};
  const promise = new Promise<GeneratedPuzzle | null>((resolve) => {
    settle = resolve;
  });

  worker.onmessage = (event: MessageEvent<GeneratorResponse>) => {
    const message = event.data;
    if (message.type === 'progress') {
      onProgress?.({ stats: message.stats });
      return;
    }
    if (message.type === 'done') {
      settle(
        message.puzzle && message.rating
          ? { puzzle: message.puzzle, rating: message.rating, inBand: message.inBand }
          : null
      );
    } else {
      console.error('Puzzle generation failed:', message.message);
      settle(null);
    }
    worker.terminate();
  };

  worker.onerror = () => {
    settle(null);
    worker.terminate();
  };

  const request: GenerateRequest = {
    type: 'generate',
    target: level.target,
    seed,
    budgetMs: BUDGET_MS,
  };
  worker.postMessage(request);

  return {
    levelId: level.id,
    seed,
    promise,
    cancel: () => {
      worker.terminate();
      settle(null);
    },
  };
}

/**
 * Holds at most one ready puzzle and one in-flight generation per session.
 *
 * Only one of each: a deeper buffer would spend the player's battery generating
 * puzzles they may never ask for, and one is enough to cover the gap between
 * finishing a puzzle and starting the next.
 */
class GenerationService {
  private ready: GeneratedPuzzle | null = null;
  private readyLevelId: number | null = null;
  private job: Job | null = null;

  /**
   * Kick off a generation nobody is waiting for yet — for the level the player
   * used last, on the assumption they will pick it again, which is overwhelmingly
   * how people behave. A wrong guess costs some background work and nothing else.
   */
  speculate(levelId: number): void {
    if (this.ready && this.readyLevelId === levelId) return;
    if (this.job?.levelId === levelId) return;
    this.startBackgroundJob(levelId);
  }

  private startBackgroundJob(levelId: number): void {
    this.job?.cancel();
    const level = levelById(levelId);
    const job = startJob(level, randomSeed());
    this.job = job;

    void job.promise.then((result) => {
      if (this.job !== job) return; // Superseded; its result is for the wrong level.
      this.job = null;
      if (result) {
        this.ready = result;
        this.readyLevelId = levelId;
      }
    });
  }

  /**
   * Get a puzzle at the requested level, using pre-generated work where it
   * exists. Returns instantly from the buffer, waits on an in-flight job for
   * the same level rather than restarting it, and only generates from scratch
   * when neither applies.
   */
  async take(
    levelId: number,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<GeneratedPuzzle | null> {
    if (this.ready && this.readyLevelId === levelId) {
      const result = this.ready;
      this.ready = null;
      this.readyLevelId = null;
      this.refill(levelId);
      return result;
    }

    // Speculation for this level may already be under way: joining it is the
    // whole point of having started early.
    if (this.job && this.job.levelId === levelId) {
      const result = await this.job.promise;
      this.job = null;
      if (result) {
        this.refill(levelId);
        return result;
      }
    } else {
      this.job?.cancel();
      this.job = null;
    }

    const job = startJob(levelById(levelId), randomSeed(), onProgress);
    this.job = job;
    const result = await job.promise;
    if (this.job === job) this.job = null;
    if (result) this.refill(levelId);
    return result;
  }

  /** Start on the next puzzle while the player solves the one just handed out. */
  private refill(levelId: number): void {
    if (this.ready || this.job) return;
    this.startBackgroundJob(levelId);
  }

  /** True when a puzzle for this level is sitting ready to hand out. */
  hasReady(levelId: number): boolean {
    return this.ready !== null && this.readyLevelId === levelId;
  }

  reset(): void {
    this.job?.cancel();
    this.job = null;
    this.ready = null;
    this.readyLevelId = null;
  }
}

export const generationService = new GenerationService();

/**
 * Start speculating once the page is idle.
 *
 * After first paint, not during it: kicking off heavy work while the landing
 * page is still rendering would trade a wait nobody notices for one they do.
 */
export function speculateWhenIdle(levelId: number): void {
  const start = () => generationService.speculate(levelId);
  if (typeof requestIdleCallback === 'function') requestIdleCallback(start, { timeout: 2000 });
  else setTimeout(start, 500);
}
