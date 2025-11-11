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
    - Drag (mouse down + move) to fill/mark multiple cells within a single array
  - **Mobile:**
    - Two toggle buttons: "Fill" mode and "Mark Empty" mode
    - Tap cell to apply current mode (fill or mark empty)
    - Drag (touch + move) to apply current mode to multiple cells within a single array
  - **Common behavior:**
    - Dragging is constrained to the array (row or column) where the drag started
    - Cannot drag diagonally or switch between rows/columns mid-drag
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

### V1: Puzzle Generation & Solver Assistance

- [ ] Puzzle generator (algorithm-based)
  - Generate valid nonogram puzzles of various sizes
  - Ensure puzzles have unique solutions
- [ ] Difficulty ratings
  - Algorithm to assess puzzle difficulty
  - Categorize generated puzzles by difficulty level
- [ ] Hint system (solver assistance features)
  - Reveal next logical cell
  - Check for errors
  - Show possible moves

### V2: Enhanced Features

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

### Phase 3: Puzzle Generation & Solver Assistance

1. Implement puzzle generator algorithm
   - Generate valid nonogram patterns
   - Ensure unique solutions
   - Support multiple grid sizes
2. Implement difficulty rating algorithm
   - Analyze solving techniques required
   - Categorize puzzles (easy, medium, hard)
3. Build hint system
   - Logic to identify next solvable cell
   - Error checking functionality
   - Show possible moves feature

### Phase 4: UI Components (Mobile-First)

1. Build responsive Grid component
2. Build Cell component with touch/mouse interaction
   - Desktop: left-click to fill, right-click to mark empty
   - Mobile: tap applies current mode
3. Build Clues component with mobile layout
4. Build ModeToggle component (mobile: Fill/Mark Empty buttons)
5. Build Controls (reset, undo, check)
6. Implement drag interaction
   - Constrained to single array (row or column)
   - Desktop: drag follows mouse button (left = fill, right = mark)
   - Mobile: drag applies current mode
7. Style with Tailwind (mobile-first breakpoints)

### Phase 5: State Management

1. Set up Zustand store for game state
2. Implement undo/redo functionality

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

### Phase 7: Enhanced Features (V2)

1. Auto-save progress to localStorage
2. Highlight active array on hover
3. Multiple color support (colored nonograms)
4. Statistics tracking (completion time, moves)
5. Haptic feedback (mobile)
6. Dark mode support

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
