# Nonogram Webapp - Development Plan

## Project Overview

A web-based nonogram puzzle game built with TypeScript. Nonograms are picture logic puzzles where players fill in cells on a grid based on number clues to reveal a hidden picture.

## Technology Stack

- **Language**: TypeScript
- **Frontend**: React + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Testing**: Vitest + React Testing Library
- **Code Quality**: ESLint, Prettier, Husky (pre-commit hooks)
- **PWA**: Vite PWA Plugin
- **Deployment**: GitHub Pages + GitHub Actions CI/CD

## Key Terminology

- **Clues**: Numbers indicating consecutive filled cells in each row/column
- **Hints**: Optional assistance features (different from clues)
- **Array**: Generic term for row or column
- **Cell States**: Empty, Filled, Marked Empty (X)
- **Mode** (Mobile): Fill or Mark Empty interaction mode

## Project Structure

```
nonogram/
├── src/
│   ├── components/     # React components (Grid, Cell, Controls, etc.)
│   ├── logic/          # Game logic (solver, generator, validation)
│   ├── store/          # Zustand state management
│   ├── data/           # Puzzle data (JSON)
│   ├── types/          # TypeScript types
│   └── utils/          # Utility functions
├── .github/workflows/  # CI/CD pipelines
└── tests/              # Test files
```

## Completed Features

### Phase 1: Project Setup ✅

- Vite + React + TypeScript
- Tailwind CSS
- ESLint + Prettier + Husky pre-commit hooks
- GitHub Actions (CI + Deploy)
- Type definitions

### Phase 2: Core Game Logic ✅

- Clue generation from solution
- Validation logic
- Puzzle data format (JSON with human-readable `#` and `.` notation)
- 10 sample puzzles (5 easy, 3 medium, 2 hard)

### Phase 3: UI Components ✅

- Responsive Grid and Cell components
- Mobile-first design with touch/mouse interaction
- Desktop: left-click fill, right-click mark empty
- Mobile: toggle buttons for Fill/Mark Empty modes
- Clue display integrated in GameBoard
- Controls (reset, undo, check)

### Phase 4: State Management ✅

- Zustand store for game state
- Undo/redo functionality

### Phase 5: Puzzle Generation ✅

- **Solver**: Array-by-array constraint propagation algorithm
  - Solves puzzles using pure logic (no guessing)
  - Difficulty rating based on solving passes (Easy ≤3, Medium ≤10, Hard >10)
  - 11 comprehensive unit tests
- **Pattern Generator**: Cellular automaton smoothing with seeded RNG (seedrandom library)
- **Generator Pipeline**: Generate-and-verify approach
  - Rejects puzzles requiring guessing or with multiple solutions
  - Max 100 attempts per generation
- **UI**: Basic puzzle generator with seed input, size selector, loading states
- **Tests**: 21 total tests passing (solver + generator)
- **Code Quality**: Named enums, lodash integration, separated solver types from UI types

### Phase 6: Polish ✅

- Thicker grid lines every 5 rows/columns (internal divisions only, not edges)
- Unit tests for core logic (21 tests)

## Planned Features

### Phase 6: PWA & Polish (In Progress)

- [x] Deploy to GitHub Pages
- [ ] Design custom app icons (favicon, PWA icons)
- [ ] Configure PWA manifest
- [ ] Service worker for offline support
- [ ] Component tests
- [ ] Animations and transitions
- [ ] Performance optimization
- [ ] Puzzle completion recognition/celebration
  - Check playerGrid against cached solution (don't run solver on every move)
  - Display congratulations message/animation when puzzle is solved
- [ ] Larger X marks for marked empty cells (should fill more of the cell)
- [ ] Improve mobile mode toggle buttons
  - Move Fill/Mark Empty buttons below the puzzle instead of above
  - Label buttons with visual icons (filled square for Fill, X for Mark Empty) instead of text labels
  - Eliminate excessive whitespace between puzzle and buttons
- [ ] Click completed clue to auto-mark remaining cells as empty
- [ ] Real-time mistake highlighting (red) to prevent wasted effort

### Phase 7: Enhanced Puzzle Selection UI

**Planned features:**

- Daily puzzles (uses date as seed: `2025-01-17-10`)
- Quick play (random UUID seed)
- Pre-made puzzle library (with icons/emoji)
- Advanced: manual seed entry for sharing puzzles

### Phase 8: Additional Enhancements

- [ ] Auto-save progress to localStorage
- [ ] Highlight active row/column on hover
- [ ] Multiple color support (colored nonograms)
- [ ] Statistics tracking (completion time, moves)
- [ ] Haptic feedback (mobile)
- [ ] Dark mode
- [ ] Drag interaction (fill/mark multiple cells)
  - Constrained to single array
  - Desktop: drag follows mouse button
  - Mobile: drag applies current mode

### Phase 9: Large Puzzle Support (V3)

- [ ] 20×20 and 25×25 grid sizes
- [ ] Pinch-to-zoom gestures
- [ ] Two-finger pan navigation
- [ ] Optimized rendering for large grids
- [ ] Device capability detection

## Puzzle Data Format

Puzzles stored in JSON with human-readable format:

```json
{
  "id": "heart",
  "title": "Heart",
  "difficulty": "easy",
  "solution": [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."]
}
```

- `#` = Filled cell
- `.` = Empty cell
- Clues generated programmatically from solution

## Deployment

- **Build**: `npm run build` → `dist/`
- **URL**: `https://karstendick.github.io/nonogram/`
- **CI/CD**: GitHub Actions workflows
  - CI: lint, format check, type check, test, build
  - Deploy: automated on push to `main`

## Success Criteria (V1)

- Playable nonogram puzzles (5×5, 10×10, 15×15)
- Smooth mobile experience with touch gestures
- Installable as PWA
- Offline support
- Responsive design (mobile-first)
- Clean, type-safe TypeScript code
- Zero ESLint warnings
- Automated quality checks (pre-commit + CI)
- Test coverage for core logic
