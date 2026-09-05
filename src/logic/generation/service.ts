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
  size: number;
  levelId: number;
  seed: string;
  promise: Promise<GeneratedPuzzle | null>;
  cancel: () => void;
}

/**
 * The buffer key. Size joined difficulty when Quick Play regained its size
 * control: a ready 15x15 Medium is not what a 5x5 Medium request wants.
 */
const keyOf = (size: number, levelId: number) => `${size}:${levelId}`;
const matches = (job: Job, size: number, levelId: number) =>
  job.size === size && job.levelId === levelId;

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
  size: number,
  level: DifficultyLevel,
  seed: string,
  onProgress?: (progress: GenerationProgress) => void
): Job {
  if (!supportsWorkers()) {
    const result = generateForTarget({ size, rung: level.rung }, seed, { budgetMs: BUDGET_MS });
    return {
      size,
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
    target: { size, rung: level.rung },
    seed,
    budgetMs: BUDGET_MS,
  };
  worker.postMessage(request);

  return {
    size,
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
 * finishing a puzzle and starting the next. Emphatically not one per size and
 * level — that would be twelve background generations for a player who picks
 * one.
 */
class GenerationService {
  private ready: GeneratedPuzzle | null = null;
  private readyKey: string | null = null;
  private job: Job | null = null;

  /**
   * Kick off a generation nobody is waiting for yet — for the level the player
   * used last, on the assumption they will pick it again, which is overwhelmingly
   * how people behave. A wrong guess costs some background work and nothing else.
   */
  speculate(size: number, levelId: number): void {
    if (this.hasReady(size, levelId)) return;
    if (this.job && matches(this.job, size, levelId)) return;
    this.startBackgroundJob(size, levelId);
  }

  private startBackgroundJob(size: number, levelId: number): void {
    this.job?.cancel();
    const job = startJob(size, levelById(levelId), randomSeed());
    this.job = job;

    void job.promise.then((result) => {
      if (this.job !== job) return; // Superseded; its result is for the wrong target.
      this.job = null;
      if (result) {
        this.ready = result;
        this.readyKey = keyOf(size, levelId);
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
    size: number,
    levelId: number,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<GeneratedPuzzle | null> {
    if (this.hasReady(size, levelId)) {
      const result = this.ready!;
      this.ready = null;
      this.readyKey = null;
      this.refill(size, levelId);
      return result;
    }

    // Speculation for this target may already be under way: joining it is the
    // whole point of having started early.
    if (this.job && matches(this.job, size, levelId)) {
      const result = await this.job.promise;
      this.job = null;
      if (result) {
        this.refill(size, levelId);
        return result;
      }
    } else {
      this.job?.cancel();
      this.job = null;
    }

    const job = startJob(size, levelById(levelId), randomSeed(), onProgress);
    this.job = job;
    const result = await job.promise;
    if (this.job === job) this.job = null;
    if (result) this.refill(size, levelId);
    return result;
  }

  /** Start on the next puzzle while the player solves the one just handed out. */
  private refill(size: number, levelId: number): void {
    if (this.ready || this.job) return;
    this.startBackgroundJob(size, levelId);
  }

  /** True when a puzzle for this size and level is sitting ready to hand out. */
  hasReady(size: number, levelId: number): boolean {
    return this.ready !== null && this.readyKey === keyOf(size, levelId);
  }

  reset(): void {
    this.job?.cancel();
    this.job = null;
    this.ready = null;
    this.readyKey = null;
  }
}

export const generationService = new GenerationService();

/**
 * Start speculating once the page is idle.
 *
 * After first paint, not during it: kicking off heavy work while the landing
 * page is still rendering would trade a wait nobody notices for one they do.
 */
export function speculateWhenIdle(size: number, levelId: number): void {
  const start = () => generationService.speculate(size, levelId);
  if (typeof requestIdleCallback === 'function') requestIdleCallback(start, { timeout: 2000 });
  else setTimeout(start, 500);
}
