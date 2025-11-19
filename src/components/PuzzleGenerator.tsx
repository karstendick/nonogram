import { useState } from 'react';
import { generatePuzzle } from '../logic/puzzleGenerator';
import { Puzzle } from '../types';

interface PuzzleGeneratorProps {
  onPuzzleGenerated: (puzzle: Puzzle) => void;
}

export function PuzzleGenerator({ onPuzzleGenerated }: PuzzleGeneratorProps) {
  const [seed, setSeed] = useState('');
  const [size, setSize] = useState<5 | 10 | 15>(10);
  const [status, setStatus] = useState<'ready' | 'generating' | 'success' | 'failed'>('ready');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!seed.trim()) {
      setError('Please enter a seed');
      return;
    }

    setStatus('generating');
    setError(null);

    // Run generation in a timeout to allow UI to update
    void setTimeout(() => {
      try {
        const puzzle = generatePuzzle(size, seed.trim());

        if (puzzle) {
          setStatus('success');
          onPuzzleGenerated(puzzle);
        } else {
          setStatus('failed');
          setError(`Failed to generate a valid puzzle after 100 attempts. Try a different seed.`);
        }
      } catch (err) {
        setStatus('failed');
        setError(
          `Error during generation: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    }, 10);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGenerate();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Generate Puzzle</h2>

      {/* Seed input */}
      <div className="mb-4">
        <label htmlFor="seed-input" className="block text-sm font-medium text-gray-700 mb-2">
          Seed
        </label>
        <input
          id="seed-input"
          type="text"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="e.g., puzzle-123"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          disabled={status === 'generating'}
        />
        <p className="mt-1 text-xs text-gray-500">Enter any text to use as a seed for generation</p>
      </div>

      {/* Size selector */}
      <div className="mb-6">
        <div className="block text-sm font-medium text-gray-700 mb-2">Size</div>
        <div className="flex gap-4">
          {([5, 10, 15] as const).map((s) => (
            <label key={s} className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="size"
                value={s}
                checked={size === s}
                onChange={() => setSize(s)}
                disabled={status === 'generating'}
                className="mr-2 cursor-pointer"
              />
              <span className="text-sm text-gray-700">
                {s}×{s}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={status === 'generating' || !seed.trim()}
        className={`w-full py-2 px-4 rounded-md font-semibold transition-colors ${
          status === 'generating' || !seed.trim()
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-purple-600 text-white hover:bg-purple-700'
        }`}
      >
        {status === 'generating' ? 'Generating...' : 'Generate Puzzle'}
      </button>

      {/* Status messages */}
      {status === 'success' && (
        <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-md">
          Puzzle generated successfully!
        </div>
      )}

      {status === 'failed' && error && (
        <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md">
          <p className="font-semibold">Generation failed</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}
