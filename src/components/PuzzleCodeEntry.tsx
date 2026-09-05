import { useEffect, useRef, useState } from 'react';
import { Puzzle } from '../types';
import { puzzleFromCode } from '../logic/puzzleGenerator';
import { codeFromInput } from '../logic/puzzleCode';

interface PuzzleCodeEntryProps {
  onPuzzleLoaded: (puzzle: Puzzle) => void;
}

/**
 * Opening a puzzle someone shared with you.
 *
 * A disclosure rather than a page: a bare text box on the landing page would
 * invite input from the majority of players who have no code and no reason to
 * type anything, while a whole page for one input and one button is a
 * navigation that buys nothing.
 *
 * Takes a bare code or a full link — people paste whichever they were given.
 */
export function PuzzleCodeEntry({ onPuzzleLoaded }: PuzzleCodeEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on reveal, so a paste can follow the click with nothing in between.
  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  const handleLoad = () => {
    const code = codeFromInput(value);
    if (!code) {
      setError('Paste a puzzle code to open it.');
      return;
    }
    const puzzle = puzzleFromCode(code);
    if (!puzzle) {
      setError('That is not a valid puzzle code.');
      return;
    }
    setError(null);
    onPuzzleLoaded(puzzle);
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <button
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className="w-full p-6 text-left group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔑</span>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Enter a code</h2>
              <p className="text-sm text-gray-600">Open a puzzle someone shared with you</p>
            </div>
          </div>
          <span
            className={`text-gray-400 group-hover:text-gray-600 transition-transform text-xl ${
              expanded ? 'rotate-90' : ''
            }`}
          >
            →
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-6 -mt-2">
          <label htmlFor="code-input" className="block text-sm font-medium text-gray-700 mb-2">
            Puzzle code
          </label>
          <div className="flex gap-2">
            <input
              id="code-input"
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLoad();
              }}
              placeholder="Paste a code or link"
              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleLoad}
              disabled={!value.trim()}
              className={`px-4 py-2 rounded-md font-semibold transition-colors ${
                value.trim()
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Enter
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </div>
      )}
    </div>
  );
}
