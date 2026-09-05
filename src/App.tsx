import { useEffect, useMemo, useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { ModeToggle } from './components/ModeToggle';
import { CompletionModal } from './components/CompletionModal';
import { LandingPage } from './components/LandingPage';
import { PuzzleSelector } from './components/PuzzleSelector';
import { SolveReplay } from './components/SolveReplay';
import { useGameStore } from './store/gameStore';
import { encodePuzzleCode, shareUrl } from './logic/puzzleCode';
import { puzzleFromCode } from './logic/puzzleGenerator';
import { buildReplaySequence } from './logic/replay';
import { RatingBadge } from './components/RatingBadge';
import type { Puzzle } from './types';

/**
 * The puzzle's code, and a link to it.
 *
 * Shows the code but copies the link: a full URL is too long to sit in a header,
 * while the code is what identifies the puzzle to anyone reading a screenshot.
 * The label says "Copy link" so the difference is stated rather than discovered.
 */
function PuzzleCodeDisplay({ puzzle, className = '' }: { puzzle: Puzzle; className?: string }) {
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => encodePuzzleCode(puzzle.solution), [puzzle.solution]);

  const handleClick = () => {
    navigator.clipboard
      .writeText(shareUrl(code))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy link:', err);
      });
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono bg-gray-100 hover:bg-gray-200 rounded transition-colors select-none ${className}`}
      title="Copy a link to this puzzle"
      aria-label={`Copy link to puzzle ${code}`}
    >
      <span className="text-gray-600">Code:</span>
      <span className="font-semibold text-gray-800">{code}</span>
      {copied ? (
        <span className="text-green-600 font-semibold">✓ Copied link</span>
      ) : (
        <span className="text-gray-400">📋</span>
      )}
    </button>
  );
}

/** The code a shared link carries, if this page was opened from one. */
function codeFromHash(): string {
  return window.location.hash.replace(/^#/, '');
}

function App() {
  const { currentPuzzle, playerGrid, markLog, isComplete, loadPuzzle } = useGameStore();

  // A shared link is an explicit request, so it beats resuming saved progress.
  //
  // Both reads are pure: StrictMode invokes an initializer twice and keeps the
  // second result, so anything that consumed the hash here would throw away
  // what the first call learned. Clearing it is an effect, below.
  const [sharedCode] = useState(codeFromHash);
  const [sharedPuzzle] = useState(() => (sharedCode ? puzzleFromCode(sharedCode) : null));

  // Guarded by id, so running twice under StrictMode loads once.
  if (sharedPuzzle && useGameStore.getState().currentPuzzle?.id !== sharedPuzzle.id) {
    loadPuzzle(sharedPuzzle);
  }

  /**
   * Consume the link once it has been acted on. Left in place, a reload would
   * re-open the shared puzzle from scratch and discard the solve in progress on
   * it — the player's own work, destroyed by a refresh.
   */
  useEffect(() => {
    if (!sharedCode) return;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, [sharedCode]);

  // If a puzzle was persisted from a previous session and isn't finished, resume it.
  const hasSavedProgress = currentPuzzle !== null && !useGameStore.getState().isComplete;
  const [view, setView] = useState<'landing' | 'premade' | 'game'>(
    sharedPuzzle || hasSavedProgress ? 'game' : 'landing'
  );
  // A link whose code does not name a puzzle should say so rather than show a blank.
  const badLink = Boolean(sharedCode) && !sharedPuzzle;

  // Replay of the player's solve, shown before the completion modal
  const [replayPhase, setReplayPhase] = useState<'idle' | 'playing' | 'done'>('idle');
  const [forceReplay, setForceReplay] = useState(false);
  const [wasComplete, setWasComplete] = useState(isComplete);

  const replaySequence = useMemo(
    () =>
      isComplete && currentPuzzle
        ? buildReplaySequence(markLog, playerGrid, currentPuzzle.width)
        : [],
    [isComplete, currentPuzzle, markLog, playerGrid]
  );

  // Start the replay when the puzzle is solved during this session. A puzzle
  // that was already complete on load doesn't replay — that path goes to the
  // landing page anyway.
  //
  // Adjusted during render rather than in an effect. An effect runs after the
  // browser has already painted, so there was one frame where the puzzle was
  // complete but the replay had not started — long enough to flash the
  // completion modal before the animation. React discards this render and
  // re-runs it before committing anything, so the intermediate state is never
  // shown.
  if (isComplete !== wasComplete) {
    setWasComplete(isComplete);
    if (isComplete) {
      setForceReplay(false);
      setReplayPhase('playing');
    } else {
      setReplayPhase('idle');
    }
  }

  const startReplay = () => {
    setForceReplay(true);
    setReplayPhase('playing');
  };

  const handlePuzzleSelected = (puzzle: Puzzle) => {
    loadPuzzle(puzzle);
    setWasComplete(false);
    setReplayPhase('idle');
    setView('game');
  };

  const handleBackToLanding = () => {
    setView('landing');
  };

  // Landing page
  if (view === 'landing') {
    return (
      <>
        {badLink && (
          <div className="bg-red-100 text-red-800 text-sm text-center py-2 px-4">
            That link does not point at a valid puzzle.
          </div>
        )}
        <LandingPage
          onPuzzleSelected={handlePuzzleSelected}
          onNavigateToPremade={() => setView('premade')}
        />
      </>
    );
  }

  // Pre-made puzzles page
  if (view === 'premade') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center p-4 sm:p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">Nonogram Puzzle</h1>
          <p className="text-gray-600">Select a puzzle to play</p>
        </div>

        <button
          onClick={handleBackToLanding}
          className="mb-6 px-4 py-2 bg-white text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
        >
          ← Back to Home
        </button>

        <PuzzleSelector
          onPuzzleSelected={handlePuzzleSelected}
          currentPuzzleId={currentPuzzle?.id}
        />
      </div>
    );
  }

  // Game page

  return (
    <div className="min-h-screen bg-white sm:bg-gradient-to-br sm:from-blue-50 sm:to-indigo-100 flex flex-col items-center sm:p-8">
      {/* Header - minimal on mobile, full on desktop */}
      <div className="w-full sm:text-center sm:mb-6">
        {/* Mobile header - compact */}
        <div className="sm:hidden px-2 py-2 bg-gray-50">
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={handleBackToLanding}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors select-none"
              aria-label="Back to home"
            >
              ← Back
            </button>
            {currentPuzzle && (
              <div className="text-xs text-gray-600 text-right">
                <div>
                  {currentPuzzle.width} × {currentPuzzle.height}
                </div>
                <RatingBadge
                  rating={currentPuzzle.rating}
                  reveal={isComplete}
                  className="text-[10px] leading-tight"
                />
              </div>
            )}
          </div>
          {currentPuzzle && (
            <div className="flex justify-center">
              <PuzzleCodeDisplay puzzle={currentPuzzle} />
            </div>
          )}
        </div>

        {/* Desktop header - full */}
        <div className="hidden sm:block">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">Nonogram Puzzle</h1>
          {currentPuzzle && (
            <>
              <div className="text-sm sm:text-base text-gray-600">
                <span className="font-semibold">{currentPuzzle.title}</span>
                <span className="mx-2">•</span>
                <RatingBadge rating={currentPuzzle.rating} reveal={isComplete} />
                <span className="mx-2">•</span>
                <span>
                  {currentPuzzle.width} × {currentPuzzle.height}
                </span>
              </div>
              <div className="mt-2 flex justify-center">
                <PuzzleCodeDisplay puzzle={currentPuzzle} />
              </div>
            </>
          )}
          <button
            onClick={handleBackToLanding}
            className="mt-4 px-4 py-2 bg-white text-gray-700 rounded-md hover:bg-gray-100 transition-colors select-none"
          >
            ← Back to Home
          </button>
        </div>
      </div>

      {/* Game Board - maximize space on mobile */}
      <div className="w-full flex-1 overflow-x-auto overflow-y-auto flex flex-col items-center sm:mb-6 sm:flex-initial sm:max-h-[70vh]">
        {replayPhase === 'playing' && currentPuzzle ? (
          <SolveReplay
            sequence={replaySequence}
            width={currentPuzzle.width}
            height={currentPuzzle.height}
            forcePlay={forceReplay}
            onFinished={() => setReplayPhase('done')}
          />
        ) : (
          <>
            <GameBoard />
            {/* Mobile Mode Toggle - directly below puzzle */}
            <div className="w-full px-2 mt-1 mb-2 sm:hidden">
              <ModeToggle />
            </div>
          </>
        )}
      </div>

      {/* Help tooltip - desktop only */}
      <div className="hidden sm:block mt-8">
        <div className="relative inline-block group">
          <button
            className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors text-gray-600 hover:text-gray-800 select-none"
            aria-label="Show help"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
          <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg whitespace-nowrap shadow-lg pointer-events-none">
            <div className="text-center">
              <span className="font-semibold">Desktop:</span> Left-click to fill; right-click or
              shift-click to mark empty
            </div>
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="border-4 border-transparent border-t-gray-800"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Modal - held back until the replay finishes */}
      {replayPhase !== 'playing' && (
        <CompletionModal
          onBackToSelection={handleBackToLanding}
          onPlayAnother={handlePuzzleSelected}
          onWatchReplay={startReplay}
          canWatchReplay={replaySequence.length > 0}
        />
      )}
    </div>
  );
}

export default App;
