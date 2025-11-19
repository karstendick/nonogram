# Nonogram Webapp - Development Plan

## Project Overview

A web-based nonogram puzzle game built with TypeScript. Nonograms are picture logic puzzles where players fill in cells on a grid based on number clues to reveal a hidden picture.

## Terminology

To maintain clarity throughout the project, we'll use these consistent terms:

- **Clues**: The numbers displayed above each column and to the left of each row that indicate how many consecutive filled cells exist in that array. These are essential for solving the puzzle.
  - Example: "3 1 2" means there are groups of 3, 1, and 2 filled cells (in that order) with at least one empty cell between groups.

- **Hints**: Optional assistance features for players who are stuck (e.g., "reveal next cell", "check for errors"). These are helper features, not the puzzle clues.

- **Array**: A generic term for either a row or column. Useful when writing logic that applies to both.
  - Example: "Check if this array is complete" works for both rows and columns.

- **Cell**: Individual square in the grid. Can be in one of three states:
  - Empty (unfilled, default state)
  - Filled (marked as part of the solution)
  - Marked Empty (marked with X to indicate definitely not part of solution)

- **Grid**: The entire playing area containing all cells.

- **Puzzle**: The complete nonogram challenge including the solution, clues, metadata (title, difficulty, etc.).

- **Solution**: The correct pattern of filled cells that creates the hidden picture.

- **Mode**: (Mobile only) The current interaction mode - either "Fill" or "Mark Empty". Determines what happens when the user taps a cell. Selected via toggle buttons.

## Technology Stack

- **Language**: TypeScript
- **Frontend Framework**: React
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint (TypeScript + React rules)
- **Formatting**: Prettier
- **Git Hooks**: Husky + lint-staged (pre-commit checks)
- **PWA**: Vite PWA Plugin (installable app, offline support)
- **Package Manager**: npm
- **Deployment**: GitHub Pages (static hosting)
- **CI/CD**: GitHub Actions (lint, test, build, deploy)

## Core Features

### V1: Basic Gameplay

- [ ] Grid rendering system
  - Variable grid sizes (5x5, 10x10, 15x15)
  - Cell states: empty, filled, marked-as-empty (X)
- [ ] Clue display system
  - Row clues (left side of grid)
  - Column clues (above grid)
  - Grey out clues when array is complete
- [ ] User interaction
  - **Desktop:**
    - Left click to fill cell
    - Right click to mark cell as empty
  - **Mobile:**
    - Two toggle buttons: "Fill" mode and "Mark Empty" mode
    - Tap cell to apply current mode (fill or mark empty)
- [ ] Validation logic
  - Check if solution is correct
  - Check if individual arrays are complete
  - Show errors (optional)

### V1: Game Management

- [ ] Puzzle data structure
  - JSON format for puzzle storage
  - Include metadata (title, difficulty, size)
- [ ] Puzzle library
  - Start with 10-15 pre-made puzzles
  - Categorize by difficulty
- [ ] Game state management
  - Undo/redo functionality
  - Reset puzzle

### V1: Puzzle Generation

- [ ] Puzzle generator (algorithm-based)
  - Generate valid nonogram puzzles of various sizes
  - Ensure puzzles have unique solutions
- [ ] Difficulty ratings
  - Algorithm to assess puzzle difficulty
  - Categorize generated puzzles by difficulty level

### V2: Enhanced Features

- [ ] Hint system (solver assistance features)
  - Reveal next logical cell
  - Check for errors
  - Show possible moves
- [ ] Auto-save progress to localStorage
  - Seamless background persistence on every move
  - Automatically load saved state on app launch
  - User can reset current puzzle or select different puzzle if they don't want to continue
  - No prompts or explicit save/load buttons needed
- [ ] Highlight active array on hover (highlight row/column being interacted with)
- [ ] Multiple color support (colored nonograms)
- [ ] Statistics tracking (completion time, moves, etc.)
- [ ] Haptic feedback (mobile)
- [ ] Dark mode support
- [ ] Tutorial/help system for first-time users
- [ ] Puzzle editor for users to create their own puzzles
- [ ] Share puzzle solutions (export as image)

### V3: Large Puzzle Support

- [ ] Support for larger grid sizes (20x20, 25x25)
- [ ] Pan and zoom gestures for large puzzles
  - Pinch to zoom in/out
  - Two-finger pan to navigate zoomed grid
- [ ] Optimized rendering for large grids
- [ ] Device capability detection (recommend size limits based on screen)

## Data Structures

### Puzzle Format

**JSON Storage Format** (Human-Readable):

```json
{
  "puzzles": [
    {
      "id": "heart",
      "title": "Heart",
      "difficulty": "easy",
      "solution": [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."]
    },
    {
      "id": "house",
      "title": "House",
      "difficulty": "easy",
      "solution": ["..#..", ".###.", "#####", "#...#", "#...#"]
    }
  ]
}
```

**Character Convention:**

- `#` = Filled cell (part of the picture)
- `.` = Empty cell (background)

**Benefits of this format:**

- ✅ Human-readable - you can see the picture!
- ✅ Easy to create and edit
- ✅ Git-friendly - clear diffs when puzzles change
- ✅ Width/height derived automatically from string array
- ✅ Clues generated programmatically from solution

**TypeScript Interfaces:**

```typescript
// Raw puzzle data from JSON
interface PuzzleData {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  solution: string[]; // Human-readable format
}

// Parsed puzzle for game use
interface Puzzle {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  width: number;
  height: number;
  solution: boolean[][]; // Parsed from string[] (true = filled, false = empty)
  rowClues: number[][]; // Generated from solution
  columnClues: number[][]; // Generated from solution
}

// Parsing function
function parsePuzzle(data: PuzzleData): Puzzle {
  const solution = data.solution.map((row) => row.split('').map((char) => char === '#'));
  // ... generate clues from solution
}
```

### Game State

```typescript
interface GameState {
  puzzleId: string;
  currentGrid: CellState[][];
  currentMode: InteractionMode; // For mobile: which mode is active
  moves: number;
  isComplete: boolean;
}

enum CellState {
  Empty = 0,
  Filled = 1,
  MarkedEmpty = 2,
}

enum InteractionMode {
  Fill = 'fill',
  MarkEmpty = 'mark_empty',
}
```

## Project Structure

```
nonogram/
├── src/
│   ├── components/
│   │   ├── Grid.tsx
│   │   ├── Cell.tsx
│   │   ├── Clues.tsx
│   │   ├── Controls.tsx
│   │   ├── ModeToggle.tsx          # Mobile: Fill/Mark Empty toggle
│   │   └── PuzzleSelector.tsx
│   ├── logic/
│   │   ├── puzzleParser.ts        # Parse string[] format to boolean[][]
│   │   ├── clueGenerator.ts
│   │   ├── validation.ts
│   │   ├── puzzleGenerator.ts
│   │   ├── difficultyRating.ts
│   │   └── solver.ts              # Hint system & solver logic
│   ├── store/
│   │   └── gameStore.ts          # Zustand store
│   ├── data/
│   │   └── puzzles.json
│   ├── types/
│   │   └── index.ts
│   ├── hooks/
│   ├── utils/
│   │   └── storage.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                 # Tailwind imports
├── public/
│   ├── manifest.json             # PWA manifest
│   └── icons/                    # PWA icons
├── tests/
├── .github/
│   └── workflows/
│       ├── ci.yml                # CI: lint, test, typecheck
│       └── deploy.yml            # Deploy to GitHub Pages
├── .husky/
│   └── pre-commit                # Pre-commit hook
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── eslint.config.js              # ESLint flat config
├── .prettierrc                   # Prettier config
├── .prettierignore
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## Code Quality & Developer Experience

### Linting & Formatting Setup

**ESLint Configuration:**

- TypeScript ESLint parser and rules
- React and React Hooks plugins
- Import sorting and organization
- Accessibility rules (jsx-a11y)
- Strict mode enabled

**Prettier Configuration:**

- Semi-colons: true
- Single quotes: true
- Tab width: 2
- Trailing commas: es5
- Print width: 100
- Integrates with ESLint (no conflicts)

**Pre-commit Hooks (Husky + lint-staged):**

```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,css,md}": ["prettier --write"]
}
```

**Pre-commit Hook Script (.husky/pre-commit):**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run lint-staged (linting + formatting on staged files)
npx lint-staged

# Run type check on entire project
npm run type-check

# Run tests
npm run test:ci

# Run build to verify production build succeeds
npm run build
```

**Benefits:**

- ✅ **Lint + Format** - Runs on staged files only (fast)
- ✅ **Type Check** - Catches type errors early (~2-5 seconds)
- ✅ **Tests** - Ensures nothing breaks before commit (~5-30 seconds)
- ✅ **Build** - Verifies production build succeeds (~10-30 seconds)
- 💡 **Skip option** - Run `git commit --no-verify` to bypass all checks if needed (e.g., WIP commits)

**Note:** Total pre-commit time is typically 20-60 seconds. This catches issues early before pushing to CI.

### CI/CD Pipeline

**GitHub Actions - CI Workflow (.github/workflows/ci.yml):**
Runs on every push and pull request:

1. **Lint** - ESLint with error reporting
2. **Format Check** - Prettier verification
3. **Type Check** - TypeScript compiler (tsc --noEmit)
4. **Test** - Vitest with coverage
5. **Build** - Verify production build succeeds

**GitHub Actions - Deploy Workflow (.github/workflows/deploy.yml):**
Runs on push to main (after CI passes):

1. Run CI checks
2. Build production bundle
3. Deploy to GitHub Pages

**npm Scripts:**

```json
{
  "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
  "lint:fix": "eslint . --ext ts,tsx --fix",
  "format": "prettier --write \"src/**/*.{ts,tsx,json,css,md}\"",
  "format:check": "prettier --check \"src/**/*.{ts,tsx,json,css,md}\"",
  "type-check": "tsc --noEmit",
  "test": "vitest",
  "test:ci": "vitest run --coverage",
  "validate": "npm run lint && npm run format:check && npm run type-check && npm run test:ci"
}
```

## Implementation Phases

### Phase 1: Project Setup ✅

1. ✅ Initialize Vite + React + TypeScript project
2. ✅ Install dependencies (Tailwind, Zustand, Vite PWA plugin)
3. ✅ Set up Tailwind CSS
4. ✅ Configure linting and formatting:
   - ✅ Install ESLint with TypeScript + React plugins
   - ✅ Configure ESLint flat config (eslint.config.js)
   - ✅ Install Prettier and create .prettierrc
   - ✅ Install Husky for git hooks
   - ✅ Install lint-staged for pre-commit checks
   - ✅ Configure pre-commit hook to run ESLint + Prettier + type-check + tests + build
5. ✅ Set up GitHub Actions:
   - ✅ CI workflow (lint, typecheck, test)
   - ✅ Deploy workflow (build and deploy to GitHub Pages)
6. ✅ Create basic project structure
7. ✅ Define TypeScript interfaces and types

### Phase 2: Core Game Logic ✅

1. ✅ Implement clue generation from solution
2. ✅ Implement validation logic
3. ✅ Create puzzle data format
4. ✅ Add 10 sample puzzles of varying difficulty (5 easy, 3 medium, 2 hard)

### Phase 3: UI Components (Mobile-First) ✅

1. ✅ Build responsive Grid component
2. ✅ Build Cell component with touch/mouse interaction
   - Desktop: left-click to fill, right-click to mark empty
   - Mobile: tap applies current mode
3. ✅ Build Clues component with mobile layout (integrated in GameBoard)
4. ✅ Build ModeToggle component (mobile: Fill/Mark Empty buttons)
5. ✅ Build Controls (reset, undo, check)
6. ✅ Style with Tailwind (mobile-first breakpoints)

### Phase 4: State Management ✅

1. ✅ Set up Zustand store for game state
2. ✅ Implement undo/redo functionality

### Phase 5: Puzzle Generation

#### Design Overview

We'll use a **generate-and-verify** approach inspired by Simon Tatham's puzzle collection:

1. Generate random grid patterns using cellular automaton smoothing
2. Calculate clues from the pattern
3. Verify uniqueness using a constraint solver
4. Accept or reject the puzzle based on solver results
5. Repeat until a valid, unique puzzle is generated

This approach is simple, practical, and works well for grid sizes up to ~30×30.

#### 1. Constraint Solver Implementation

**Approach:** Write our own solver (no external libraries)

- Nonogram-specific solvers don't exist in TypeScript ecosystem
- Generic constraint libraries would be overkill and increase bundle size
- Custom implementation gives us control for difficulty rating
- ~200-400 lines of focused code

**Algorithm: Array-by-array constraint propagation**

Core function: `solveArray(clues: number[], knownCells: CellState[]): CellState[]`

- Input: Clues for one array (row or column) and current known cell states
- Process: Find all valid placements of blocks that satisfy the clues
- Output: Updated cell states (cells that are the same in ALL valid placements are definite)

Full solver iterates:

1. Apply `solveArray()` to each row and column
2. Repeat until no more progress is made
3. If puzzle is complete → success (solvable with pure logic - ACCEPT)
4. If stuck but incomplete → requires guessing (REJECT during generation)

**Uniqueness verification (only during puzzle generation):**

- If logical deduction completes the puzzle → ACCEPT (solvable with pure logic, unique solution)
- If stuck and incomplete → REJECT (would require guessing)
- Use backtracking only to verify no multiple solutions exist (then REJECT if found)

**Important:** Players will never encounter puzzles requiring guessing. The solver's backtracking is only used during generation to identify and reject such puzzles.

**Solver output:**

```typescript
interface SolverResult {
  solved: boolean; // Puzzle was completed
  unique: boolean; // Has exactly one solution
  difficulty: Difficulty; // Based on techniques required
  techniques: SolvingTechnique[]; // Which techniques were needed
}
```

**Known limitation (acceptable):**
Like Simon Tatham's implementation, our array-by-array solver cannot solve puzzles requiring multi-array deduction without backtracking. This is acceptable because:

- Such puzzles are rare
- They'll be rejected during generation
- Players expect nonograms to be solvable with array-by-array logic

#### 2. Pattern Generation Algorithm

**Approach: Random grid with cellular automaton smoothing**

**Seeded Random Number Generator:**
Use the `seedrandom` library for reproducible puzzle generation.

```bash
npm install seedrandom
npm install --save-dev @types/seedrandom
```

```typescript
import seedrandom from 'seedrandom';

// Create seeded RNG
const rng = seedrandom('puzzle-seed-12345');

// Use like Math.random()
const value = rng(); // Returns deterministic value based on seed
```

**Benefits:**

- Reproducible puzzles (same seed = same puzzle)
- Can generate "daily puzzle" feature (use date as seed)
- Easier debugging (can recreate specific puzzles)
- Can share puzzle seeds with other players

Step 1: Generate random values

```typescript
// Create grid with random floats [0.0, 1.0]
// Use seeded RNG instead of Math.random()
const rng = seedrandom(seed);
const grid = Array(size)
  .fill(0)
  .map(() =>
    Array(size)
      .fill(0)
      .map(() => rng())
  );
```

Step 2: Cellular automaton smoothing

```typescript
// Average each cell with its neighbors (creates connected regions)
const smoothed = grid.map((row, r) =>
  row.map((_, c) => {
    const neighbors = getNeighbors(grid, r, c);
    return average(neighbors);
  })
);
```

Step 3: Threshold at median

```typescript
// Convert to binary (filled/empty) - targets ~50% fill rate
const median = calculateMedian(smoothed);
const binary = smoothed.map((row) => row.map((val) => val >= median));
```

**Benefits:**

- Creates more interesting patterns than pure random
- Connected regions look better (recognizable shapes)
- ~50% fill rate produces good puzzles
- Fast generation (rejection sampling is cheap)

#### 3. Puzzle Generation Pipeline

```typescript
function generatePuzzle(size: number, seed: string): Puzzle | null {
  const maxAttempts = 100; // Prevent infinite loops

  for (let i = 0; i < maxAttempts; i++) {
    // Use seed + attempt number for deterministic generation
    const attemptSeed = `${seed}-${i}`;

    // 1. Generate random pattern with seeded RNG
    const pattern = generateRandomPattern(size, attemptSeed);

    // 2. Calculate clues
    const rowClues = calculateRowClues(pattern);
    const columnClues = calculateColumnClues(pattern);

    // 3. Verify no row/column is entirely uniform (degenerate case)
    if (hasUniformRow(rowClues) || hasUniformColumn(columnClues)) {
      continue;
    }

    // 4. Attempt to solve
    const result = solvePuzzle({ pattern, rowClues, columnClues });

    // 5. Accept only if solvable with pure logic and has unique solution
    if (result.solved && result.unique) {
      return {
        id: seed, // Store seed for reproducibility
        pattern,
        rowClues,
        columnClues,
        difficulty: result.difficulty,
        techniques: result.techniques,
      };
    }

    // If not solved → requires guessing (reject)
    // If not unique → multiple solutions (reject)
  }

  return null; // Failed to generate after max attempts
}

// Example usage:
// Daily puzzle: generatePuzzle(10, '2025-01-17')
// Random puzzle: generatePuzzle(10, crypto.randomUUID())
// Shared puzzle: generatePuzzle(10, 'puzzle-abc123')
```

#### 4. Difficulty Rating Algorithm

Rate puzzles based on solving techniques required:

**Easy:**

- Only simple array solving (single-pass deduction)
- Complete blocks (clue equals array size)
- Edge fitting (blocks must touch edges)
- No backtracking needed

**Medium:**

- Multiple passes of array solving required
- Overlap detection (all valid placements share common cells)
- Cross-referencing between rows and columns
- No backtracking needed

**Hard:**

- Advanced array solving techniques
- Requires many iteration passes (>10)
- Complex overlap detection patterns
- Solvable with logic alone (no guessing)

**Rejected during generation:**

- Requires guessing/trial-and-error (incomplete after logical deduction)
- Multiple solutions (invalid)
- Not solvable with array-by-array logic alone

```typescript
function rateDifficulty(result: SolverResult): Difficulty {
  // Reject puzzles that aren't solvable with pure logic
  if (!result.solved) return 'rejected'; // Incomplete = requires guessing
  if (!result.unique) return 'rejected'; // Multiple solutions = invalid

  // All accepted puzzles are solvable with pure logic
  const passes = result.techniques.filter((t) => t.type === 'array_solve').length;

  if (passes <= 3) return 'easy';
  if (passes <= 10) return 'medium';
  return 'hard';
}
```

#### 5. Basic UI for Generated Puzzles

For Phase 5, implement a minimal interface to test generated puzzles:

**Simple seed input form:**

```
┌─────────────────────────────────┐
│ Generate Puzzle                 │
├─────────────────────────────────┤
│ Seed:  [________________]       │
│        (e.g., "puzzle-123")     │
│                                 │
│ Size:  ( ) 5×5                  │
│        (•) 10×10  ← selected    │
│        ( ) 15×15                │
│                                 │
│ [Generate Puzzle] ──────────►   │
│                                 │
│ Status: Ready / Generating... / │
│         Success / Failed        │
└─────────────────────────────────┘
```

**Component structure:**

- Add to existing PuzzleSelector component or create new GeneratePuzzleForm
- Radio buttons for size selection (5, 10, 15)
- Text input for seed
- Generate button triggers `generatePuzzle(size, seed)`
- Loading state while generating
- Error handling if generation fails (after 100 attempts)

**Future UI design (saved for later phase)** - see Phase 7 below

#### Implementation Tasks

1. **Implement array solver**
   - Core `solveArray()` function
   - Find all valid block placements
   - Intersect placements to find definite cells
   - Unit tests for various clue patterns

2. **Implement full puzzle solver**
   - Iterate over all rows and columns
   - Track which techniques were used
   - Detect when stuck (no progress)
   - Add backtracking for uniqueness verification

3. **Implement pattern generator**
   - Install and configure seedrandom library
   - Random grid generation with seeded RNG
   - Cellular automaton smoothing
   - Median thresholding
   - Clue calculation

4. **Implement puzzle generator pipeline**
   - Combine pattern generation + solver
   - Rejection sampling loop
   - Difficulty rating
   - Generate batches of puzzles

5. **Add basic generator UI**
   - Seed input field
   - Size selector (radio buttons: 5, 10, 15)
   - Generate button with loading state
   - Error handling and user feedback

### Phase 6: PWA & Polish

1. Design and create custom app icons (favicon, PWA icons)
2. Configure PWA manifest with custom icons
3. Set up service worker for offline support
4. Add install prompt
5. Write unit tests for game logic
6. Write component tests
7. Add animations and transitions
8. Performance optimization
9. Deploy to GitHub Pages

### Phase 7: Enhanced Puzzle Selection UI

Implement comprehensive puzzle selection interface with multiple puzzle sources.

#### Full Puzzle Selection UI Design

**Main screen layout:**

```
┌─────────────────────────────────────┐
│  Nonogram Puzzle                    │
├─────────────────────────────────────┤
│                                     │
│  🌟 Daily Puzzles                   │
│  ┌─────────────────────────────┐   │
│  │ January 17, 2025            │   │
│  │                             │   │
│  │ [5×5 Easy] [10×10 Med] [15×15]  │
│  │            ^^^^^^^^^ selected   │
│  │                             │   │
│  │ [Play Daily 10×10] ─────────►   │
│  └─────────────────────────────┘   │
│                                     │
│  🎲 Quick Play                      │
│  ┌─────────────────────────────┐   │
│  │ Generate Random Puzzle      │   │
│  │                             │   │
│  │ Size:  [5×5] [10×10] [15×15]│   │
│  │        ^^^^^ (selected)     │   │
│  │                             │   │
│  │ [Generate & Play] ──────────►   │
│  └─────────────────────────────┘   │
│                                     │
│  📚 Pre-made Puzzles (10)          │
│  ┌─────────────────────────────┐   │
│  │ ❤️  Heart     • Easy  • 7×7  │   │
│  │ 🏠 House     • Easy  • 5×5  │   │
│  │ ☕ Coffee    • Medium • 10×10│   │
│  │ ...                         │   │
│  └─────────────────────────────┘   │
│                                     │
│  ⚙️ Advanced                        │
│  ┌─────────────────────────────┐   │
│  │ Load Puzzle by Seed         │   │
│  │ Seed: [puzzle-abc123_____]  │   │
│  │ Size: [5×5] [10×10] [15×15] │   │
│  │ [Load Puzzle] ──────────────►   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Features:**

1. **Daily Puzzles** (top, featured)
   - Three daily puzzles (one per size: 5×5, 10×10, 15×15)
   - Uses date + size as seed (`2025-01-17-10`)
   - Changes daily at midnight
   - Engagement hook for repeat visits

2. **Quick Play**
   - Size selector buttons
   - "Generate & Play" generates random UUID seed
   - Instant random puzzles for casual play

3. **Pre-made Puzzles** (collapsible)
   - Curated collection with icons/emoji
   - Known-good puzzles
   - Shows difficulty and size

4. **Advanced** (collapsible)
   - Manual seed entry
   - Size selector
   - Share/bookmark specific puzzles
   - Power user feature

**Implementation notes:**

- Daily puzzle seeds: `${YYYY-MM-DD}-${size}` (e.g., `2025-01-17-10`)
- Random puzzle seeds: `crypto.randomUUID()`
- Collapsible sections for mobile
- Loading states for generation
- Error handling with retry option

### Phase 8: Additional Enhanced Features

1. Auto-save progress to localStorage
2. Highlight active array on hover
3. Add thicker grid lines every 5 rows/columns to improve usability
4. Multiple color support (colored nonograms)
5. Statistics tracking (completion time, moves)
6. Haptic feedback (mobile)
7. Dark mode support
8. Drag interaction (fill/mark multiple cells in one stroke)
   - Constrained to single array (row or column)
   - Desktop: drag follows mouse button (left = fill, right = mark)
   - Mobile: drag applies current mode

### Phase 8: Large Puzzle Support (V3)

1. Implement 20x20 and 25x25 grid sizes
2. Add pinch-to-zoom gesture support
3. Add two-finger pan gesture support
4. Optimize rendering performance for large grids
5. Add device capability detection and recommendations

## Deployment Strategy

### GitHub Pages Setup

1. Build static files with `npm run build` → `dist/` folder
2. Configure Vite base path for GitHub Pages (`/nonogram/`)
3. GitHub Actions workflow triggers on push to `main`
4. Deploy `dist/` to `gh-pages` branch
5. Access at: `https://karstendick.github.io/nonogram/`

### GitHub Actions Workflows

**CI Workflow (.github/workflows/ci.yml):**

```yaml
name: CI
on: [push, pull_request]
jobs:
  quality-checks:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Setup Node.js
      - Install dependencies
      - Run ESLint
      - Run Prettier check
      - Run TypeScript type check
      - Run Vitest with coverage
      - Build project (verify)
```

**Deploy Workflow (.github/workflows/deploy.yml):**

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Setup Node.js
      - Install dependencies
      - Run lint + test (validation)
      - Build project
      - Deploy to gh-pages branch
```

## Success Criteria (V1)

- Playable nonogram puzzles (5x5, 10x10, 15x15 grid sizes)
- Smooth mobile experience with touch gestures
- Installable as PWA (add to home screen)
- Works offline after first load
- Intuitive UI with clear visual feedback
- Proper validation and completion detection
- Responsive design (mobile-first, optimized for iPhone)
- Clean, maintainable TypeScript code
- Deployed and accessible via GitHub Pages
- Portfolio-ready code quality:
  - Zero ESLint warnings/errors
  - Consistent code formatting (Prettier)
  - Type-safe (strict TypeScript)
  - Automated pre-commit checks
  - CI/CD pipeline with quality gates
  - Test coverage for core logic

## V2 Goals

- Persistent game state across sessions (auto-save to localStorage)
- Statistics tracking (completion time, move count)
- Multiple color support for colored nonograms
- Dark mode support

## V3 Goals

- Large puzzle support (20x20, 25x25 grid sizes)
- Pan and zoom gestures for navigating large puzzles
- Optimized rendering for large grids

## Next Steps

1. Initialize Vite + React + TypeScript project
2. Install and configure Tailwind CSS
3. Set up ESLint + Prettier + Husky + lint-staged
4. Create GitHub Actions workflows (CI + Deploy)
5. Install Zustand and Vite PWA plugin
6. Create type definitions
7. Build basic grid rendering
8. Implement first sample puzzle
