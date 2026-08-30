import { useEffect, useState } from 'react';
import type { GenerationStats } from '../logic/generation/strategy';

/**
 * What to show while a puzzle is being generated.
 *
 * A few seconds is a fine wait for a hard puzzle; an opaque one is not. The
 * generator has genuinely interesting internals — candidates tried, patterns
 * rejected for having more than one solution — so the wait shows real progress
 * rather than a spinner, with lighter copy underneath for the stretches where
 * nothing much is happening.
 */
const QUIPS = [
  'Shuffling squares…',
  'Rejecting the ambiguous ones…',
  'Checking it can be solved without guessing…',
  'Looking for one that needs some thought…',
  'Almost there…',
];

interface GenerationProgressProps {
  stats: GenerationStats | null;
}

export function GenerationProgress({ stats }: GenerationProgressProps) {
  const [quip, setQuip] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setQuip((q) => (q + 1) % QUIPS.length), 2200);
    return () => clearInterval(timer);
  }, []);

  const rejected = stats ? stats.rejectedUnsolvable + stats.rejectedDegenerate : 0;

  return (
    <div className="mt-3 text-center" role="status" aria-live="polite">
      <div className="text-sm text-gray-600">{QUIPS[quip]}</div>
      {stats && stats.candidates > 0 && (
        <div className="mt-1 text-xs text-gray-500 font-mono">
          {stats.candidates} tried
          {rejected > 0 && <> · {rejected} rejected</>}
          {stats.ambiguityProofs > 0 && <> · {stats.ambiguityProofs} had two solutions</>}
        </div>
      )}
    </div>
  );
}
