import { useEffect, useState } from 'react';
import { REPLAY_TIMING } from '../logic/replay';
import type { ReplayTiming } from '../logic/replay';

// Dev-only: the replay's timing values are a feel decision, so they get sliders.
// Once the numbers are right they get written back into REPLAY_TIMING by hand.
const STORAGE_KEY = 'nonogram-replay-tuning-dev';
const COLLAPSED_KEY = 'nonogram-replay-tuning-collapsed-dev';

interface ReplayTunerProps {
  timing: ReplayTiming;
  onChange: (timing: ReplayTiming) => void;
  onReplay: () => void;
}

interface SliderSpec {
  key: keyof ReplayTiming;
  label: string;
  min: number;
  max: number;
  step: number;
}

const SLIDERS: SliderSpec[] = [
  { key: 'totalMs', label: 'Total duration', min: 500, max: 15000, step: 100 },
  { key: 'minIntervalMs', label: 'Min interval', min: 0, max: 200, step: 5 },
  { key: 'maxIntervalMs', label: 'Max interval', min: 20, max: 500, step: 5 },
  { key: 'holdMs', label: 'End hold', min: 0, max: 3000, step: 50 },
  { key: 'fadeMs', label: 'Mark fade', min: 0, max: 1000, step: 10 },
];

const readStored = (): ReplayTiming | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return { ...REPLAY_TIMING, ...(JSON.parse(raw) as Partial<ReplayTiming>) };
  } catch {
    return null;
  }
};

// Expanded, the panel covers the Skip button on a phone-sized screen, so it
// starts collapsed and remembers being opened.
const readCollapsed = (): boolean => {
  try {
    return localStorage.getItem(COLLAPSED_KEY) !== 'false';
  } catch {
    return true;
  }
};

const writeCollapsed = (collapsed: boolean) => {
  try {
    localStorage.setItem(COLLAPSED_KEY, String(collapsed));
  } catch {
    // Tuning is disposable; a full or blocked localStorage isn't worth handling
  }
};

export function ReplayTuner({ timing, onChange, onReplay }: ReplayTunerProps) {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggle = (next: boolean) => {
    setCollapsed(next);
    writeCollapsed(next);
  };

  // Restore the last tuning session so a reload doesn't reset the sliders
  useEffect(() => {
    const stored = readStored();
    if (stored) onChange(stored);
    // Only on mount: this seeds the values, it doesn't track them
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (key: keyof ReplayTiming, value: number) => {
    const next = { ...timing, [key]: value };
    onChange(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Tuning is disposable; a full or blocked localStorage isn't worth handling
    }
  };

  if (collapsed) {
    return (
      <button
        onClick={() => toggle(false)}
        className="fixed bottom-2 right-2 z-40 px-3 py-1.5 text-xs font-mono bg-gray-800 text-white rounded shadow-lg"
      >
        replay tuning
      </button>
    );
  }

  return (
    <div className="fixed bottom-2 right-2 z-40 w-64 max-h-[70vh] overflow-y-auto p-3 bg-gray-800 text-white rounded-lg shadow-lg text-left">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-semibold uppercase tracking-wide">
          Replay tuning
        </span>
        <button
          onClick={() => toggle(true)}
          className="text-gray-400 hover:text-white text-xs px-1"
          aria-label="Collapse replay tuning"
        >
          ×
        </button>
      </div>

      {SLIDERS.map(({ key, label, min, max, step }) => (
        <label key={key} className="block mb-2">
          <span className="flex justify-between text-[11px] font-mono text-gray-300">
            {label}
            <span className="text-white">{timing[key]}ms</span>
          </span>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={timing[key]}
            onChange={(e) => update(key, Number(e.target.value))}
            className="w-full"
          />
        </label>
      ))}

      <button
        onClick={onReplay}
        className="w-full mt-1 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 rounded transition-colors"
      >
        Replay
      </button>
    </div>
  );
}
