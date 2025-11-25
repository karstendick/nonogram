# Nonogram Webapp - Development Plan

## Project Overview

A web-based nonogram puzzle game built with TypeScript. Nonograms are picture logic puzzles where players fill in cells on a grid based on number clues to reveal a hidden picture.

## Technology Stack

- **Language**: TypeScript
- **Frontend**: React + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Testing**:
  - Unit: Vitest + React Testing Library
  - E2E: Playwright (desktop + mobile)
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
├── e2e/                # Playwright E2E tests
├── .github/
│   ├── actions/        # Composite actions (preview cleanup)
│   └── workflows/      # CI/CD pipelines
└── tests/              # Unit tests (Vitest)
```

## Completed Features

### Phase 1: Project Setup ✅

- Vite + React + TypeScript
- Tailwind CSS
- ESLint + Prettier + Husky pre-commit hooks
- Vitest for unit testing
- Playwright for E2E testing (desktop + mobile)
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
- Puzzle completion recognition with congratulations message
- Larger X marks for marked empty cells
- Mobile mode toggle buttons with visual icons
- Click completed clue to auto-mark remaining cells as empty
- Real-time mistake highlighting (red cells for incorrect fills)
- Drag interaction (fill/mark multiple cells in single array)

### Phase 7: Enhanced Puzzle Selection UI ✅

- New landing page with card-based navigation
- Quick Play (random UUID seed)
- Enter a Seed (manual seed entry for sharing puzzles)
- Pre-made puzzle library (with icons/emoji)
- Responsive mobile-first design
- E2E test coverage for new navigation flow
- GitHub Actions preview deployments for feature branches
- Automated preview cleanup on branch deletion

## Planned Features

### Phase 8: Additional Enhancements

- [ ] Auto-save progress to localStorage
- [ ] Haptic feedback (mobile)
- [ ] Animations and transitions
- [ ] Component tests
- [ ] Performance optimization

### Phase 9: PWA Support

- [ ] Design custom app icons (favicon, PWA icons)
- [ ] Configure PWA manifest
- [ ] Service worker for offline support
- [ ] Installable as PWA

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
- **Production URL**: `https://karstendick.github.io/nonogram/`
- **Preview URLs**: `https://karstendick.github.io/nonogram/preview/<branch-name>/`
- **CI/CD**: GitHub Actions workflows
  - CI: lint, format check, type check, test, build (on all PRs)
  - Deploy (main): automated on push to `main` branch
  - Deploy (preview): automated preview deployments for feature branches
  - Cleanup: automated preview removal on branch deletion
  - Delete merged branch: automated branch deletion and cleanup after PR merge

## Success Criteria

### V1 Status ✅

- [x] Playable nonogram puzzles (5×5, 10×10, 15×15)
- [x] Smooth mobile experience with touch gestures
- [x] Responsive design (mobile-first)
- [x] Clean, type-safe TypeScript code
- [x] Zero ESLint warnings
- [x] Automated quality checks (pre-commit + CI)
- [x] Test coverage for core logic
- [x] E2E test coverage
- [x] Automated deployment to GitHub Pages
- [ ] Installable as PWA
- [ ] Offline support
