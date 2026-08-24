import { useEffect, useMemo, useRef, useState } from 'react';
import { GameBoard } from './GameBoard';
import { buildReplayGrid, stepIntervalMs, REPLAY_TIMING } from '../logic/replay';
import type { ReplayMark, ReplayTiming } from '../logic/replay';

interface SolveReplayProps {
  sequence: ReplayMark[];
  width: number;
  height: number;
  timing?: ReplayTiming;
  // Watch Again is an explicit request for the animation, so it overrides the
  // reduced-motion preference. The automatic replay does not.
  forcePlay?: boolean;
  onFinished: () => void;
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function SolveReplay({
  sequence,
  width,
  height,
  timing = REPLAY_TIMING,
  forcePlay = false,
  onFinished,
}: SolveReplayProps) {
  const [step, setStep] = useState(0);

  // Keep the callback out of the effect's deps so changing it can't restart the replay
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  // Nothing to watch, or motion the player didn't ask for
  const skip = sequence.length === 0 || (!forcePlay && prefersReducedMotion());

  useEffect(() => {
    if (skip) {
      onFinishedRef.current();
      return;
    }

    const interval = stepIntervalMs(sequence.length, timing);
    let frame = 0;
    let holdTimer = 0;
    let startedAt: number | null = null;

    // Drive off elapsed time rather than one timer per mark: no drift, and it
    // still keeps up when the interval is shorter than a frame.
    const tick = (now: number) => {
      if (startedAt === null) startedAt = now;
      const reached = Math.min(sequence.length, Math.floor((now - startedAt) / interval));
      setStep(reached);

      if (reached >= sequence.length) {
        holdTimer = window.setTimeout(() => onFinishedRef.current(), timing.holdMs);
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    setStep(0);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      if (holdTimer) clearTimeout(holdTimer);
    };
  }, [skip, sequence, timing]);

  const grid = useMemo(
    () => buildReplayGrid(width, height, sequence, step),
    [width, height, sequence, step]
  );

  if (skip) return null;

  return (
    <div
      className="flex flex-col items-center"
      style={{ '--replay-fade-ms': `${timing.fadeMs}ms` } as React.CSSProperties}
    >
      <GameBoard displayGrid={grid} interactive={false} />

      <div className="mt-3 flex flex-col items-center gap-2">
        <p className="text-sm text-gray-600" role="status">
          Replaying your solve…
        </p>
        <button
          onClick={() => onFinished()}
          className="px-4 py-2 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:bg-gray-50 transition-colors select-none"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
