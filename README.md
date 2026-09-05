# Nonogram Puzzle Game

A web-based nonogram puzzle game built with TypeScript, React, and Vite.

**Play it:** https://karstendick.github.io/nonogram/

Nonograms are picture logic puzzles. Numbers along each row and column tell you the
runs of filled cells in that line, and working out which cells they can be reveals a
hidden picture.

## Features

**Endless generated puzzles at four difficulty levels.** Quick Play produces a fresh
15×15 puzzle on demand, at Easy, Medium, Hard or Evil. Every generated puzzle is
solvable by logic alone — none of them ever require a guess.

**Difficulty that means something.** A level is defined by the hardest kind of
reasoning a puzzle demands, not by its size or by how long it takes. Easy needs no
more than counting and simple overlaps; Evil needs proof by contradiction — assuming
a cell, following the consequences, and finding they cannot hold. Each puzzle also
reports how many deductions it takes, so a short hard puzzle and a long one are
distinguishable.

**A curated set of hand-drawn puzzles** for people new to nonograms, at 5×5, 10×10
and 15×15, each rated on the same scale as the generated ones.

**Built for playing on a phone.** Drag along a row to fill or mark several cells at
once, switch between filling and marking with a toggle, and tap a finished clue to
sweep the rest of its line.

**Help while you solve.** Wrong cells are highlighted as you go, so a mistake does
not quietly ruin the next twenty minutes.

**A replay of your solve.** Finishing a puzzle plays back the marks you made, in the
order you made them, with false starts and corrections edited out — so you watch the
picture assemble the way you actually worked it out.

**Solve stats.** The completion screen shows your moves against the number of
deductions the puzzle required, in the spirit of Minesweeper's efficiency stat.
Beating the solver is possible: one drag can cover ground it needed several separate
deductions to justify.

**Shareable puzzles.** Every puzzle — generated or hand-drawn — has a code that
encodes the puzzle itself, not instructions for rebuilding it. Copy the link,
send it, and the person who opens it gets exactly your puzzle, immediately.

**Works offline.** Progress saves as you play and survives a reload, and the app can
be installed to a home screen.

## Setup

```bash
npm install
```

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Testing

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:ci
```

## Measurement Scripts

Experiments rather than tests. They produce the data behind design decisions —
difficulty bands, which generation strategy to ship — and are excluded from
`npm test` because they take minutes rather than milliseconds.

```bash
npm run calibrate       # distribution of techniques and deductions across generator settings
npm run bakeoff         # races the generation strategies against each other
npm run levels-d        # cost of adding a puzzle-length band to each difficulty level
npm run candidate-cost  # worst-case cost of evaluating one candidate puzzle
npm run rate-premades   # recomputes the stored ratings in src/data/puzzles.json
```

They use their own Vitest config ([vitest.bakeoff.config.ts](vitest.bakeoff.config.ts))
so the normal suite never picks them up.

## Code Quality

```bash
# Lint code
npm run lint
npm run lint:fix

# Format code
npm run format
npm run format:check

# Type check
npm run type-check

# Run all checks
npm run validate
```

## Git Hooks

A Husky `pre-commit` hook ([.husky/pre-commit](.husky/pre-commit)) runs before every commit:

1. `lint-staged` — ESLint `--fix` and Prettier on staged files
2. `npm run type-check`
3. `npm run test:ci`
4. `npm run build`

## Architecture

**Stack:** TypeScript, React, Vite, Tailwind CSS, Zustand for state, Vitest and
Playwright for tests, `vite-plugin-pwa` for the service worker and manifest. Puzzle
generation runs in a Web Worker so the board stays responsive while it works.

```text
nonogram/
├── src/
│   ├── components/     # React components (Grid, Cell, LevelSelector, etc.)
│   ├── logic/
│   │   ├── difficulty/ # Technique ladder, traced solver, depth-1 search, rating
│   │   └── generation/ # Strategies, difficulty levels, worker service, bake-off
│   ├── workers/        # Web Worker entry points (puzzle generation)
│   ├── store/          # Zustand store (game state, persisted to localStorage)
│   ├── data/           # Pre-made puzzles (JSON)
│   └── types/          # Shared TypeScript types
├── docs/specs/         # Design specs for larger features
├── scripts/            # Measurement experiments (see above)
├── tests/              # Unit tests (Vitest)
├── e2e/                # End-to-end tests (Playwright)
└── .github/
    ├── actions/        # Composite actions (preview cleanup)
    └── workflows/      # CI/CD pipelines
```

### Terminology

- **Clues** — the numbers beside each row and column, giving the runs of filled cells
- **Hints** — optional assistance for the player, distinct from clues
- **Array** — a row or a column
- **Cell states** — Empty, Filled, Marked Empty (X)
- **Mode** (mobile) — whether tapping fills a cell or marks it empty
- **Rung** — one technique on the difficulty ladder, e.g. overlap or segment partitioning
- **Deduction** — one act of reading a line and marking what follows from it

### How difficulty is measured

A puzzle is rated by solving it with a solver that deliberately reaches for the
_cheapest_ technique that works, escalating only when nothing simpler makes progress.
A solver that always used its strongest tool could not say which techniques a puzzle
actually requires, which is the whole question.

That yields two numbers: the hardest rung the solve needed, and how many deductions it
took. Difficulty levels are defined by the first; the second is reported alongside.
The full reasoning, the alternatives considered, and the measurements behind the
thresholds are in [docs/specs/puzzle-difficulty.md](docs/specs/puzzle-difficulty.md).

### How puzzles are generated

A candidate pattern comes from a seeded random grid smoothed by a cellular automaton,
then thresholded to a target fill ratio. Fill ratio and smoothing rounds are the two
knobs that shift what kind of puzzle comes out, and each difficulty level has presets
measured to produce its rung most often.

Candidates are then filtered: degenerate ones are dropped, ones provably having more
than one solution are rejected cheaply, and the rest are solved and rated. A candidate
is only accepted if it rates at the requested level, within a time budget. If the
budget runs out, the closest candidate found is returned and reported with its real
rating rather than the one that was asked for — the player never ends up with nothing.

Generation happens ahead of being asked wherever possible: the next puzzle starts
generating as soon as one is handed over, and a puzzle is generated speculatively while
the player is still choosing on the landing page.

### Puzzle data format

Pre-made puzzles live in [src/data/puzzles.json](src/data/puzzles.json) in a
human-readable format:

```json
{
  "id": "heart",
  "title": "Heart",
  "rating": { "maxTechnique": 3, "deductions": 20 },
  "solution": [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."]
}
```

- `#` is a filled cell, `.` an empty one
- Clues are generated from the solution rather than stored
- `rating` is precomputed by `npm run rate-premades`. These puzzles never change, so
  recomputing their ratings on every page load would be recomputing a constant — and
  would compete for the idle time the app uses to generate the next puzzle ahead of
  being asked. A test asserts the stored values still match the scoring code.

### Specs

Larger features are designed in writing first, in [docs/specs/](docs/specs/). The specs
record the options considered and rejected, not just the outcome, so the reasoning
survives:

- [puzzle-difficulty.md](docs/specs/puzzle-difficulty.md)
- [solve-replay-animation.md](docs/specs/solve-replay-animation.md)

## CI/CD

Everything runs on GitHub Actions and deploys to GitHub Pages from the `gh-pages`
branch. There is no separate hosting provider — production and all branch previews
live in the same `gh-pages` branch, production at the root and previews under
`preview/<branch-name>/`.

- **Production:** https://karstendick.github.io/nonogram/
- **Preview index:** https://karstendick.github.io/nonogram/preview/

### Pipeline overview

```text
push to main ─┐
              ├─► CI (ci.yml) ─► on success ─┬─► Deploy to GitHub Pages (main only)
pull request ─┘                              └─► Deploy Preview (any branch but main/gh-pages)

PR merged ──────► Delete Merged Branch ─► cleanup-preview action
branch deleted ─► Cleanup Preview ──────► cleanup-preview action
```

### Workflows

| Workflow               | File                                                                                     | Trigger                                                                  | What it does                                                                                                                                                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CI                     | [.github/workflows/ci.yml](.github/workflows/ci.yml)                                     | Push to `main`, any pull request                                         | Two parallel jobs. `quality-checks`: ESLint, Prettier check, `tsc --noEmit`, Vitest with coverage, production build. `e2e-tests`: Playwright against Desktop Chrome and iPhone 14, uploading `playwright-report/` as an artifact on failure (7-day retention). |
| Deploy to GitHub Pages | [.github/workflows/deploy.yml](.github/workflows/deploy.yml)                             | `workflow_run` after CI completes on `main`                              | Only runs if CI succeeded. Builds with `VITE_BASE_PATH=/nonogram/` and pushes `dist/` to the root of `gh-pages`, preserving the existing `preview/` directory.                                                                                                 |
| Deploy Preview         | [.github/workflows/preview-deploy.yml](.github/workflows/preview-deploy.yml)             | `workflow_run` after CI completes on any branch except `main`/`gh-pages` | Only runs if CI succeeded. Skips if the branch was deleted in the meantime. Builds with `VITE_BASE_PATH=/nonogram/preview/<branch>/` and pushes to `gh-pages` under `preview/<branch>/`, regenerating the preview index page.                                  |
| Delete Merged Branch   | [.github/workflows/delete-merged-branch.yml](.github/workflows/delete-merged-branch.yml) | Pull request closed                                                      | If the PR was merged, deletes the head branch (never `main`/`master`), then removes its preview.                                                                                                                                                               |
| Cleanup Preview        | [.github/workflows/cleanup-preview.yml](.github/workflows/cleanup-preview.yml)           | Branch deleted                                                           | Removes that branch's preview directory from `gh-pages`. Catches branches deleted outside the merge flow.                                                                                                                                                      |

The shared cleanup logic lives in a local composite action,
[.github/actions/cleanup-preview](.github/actions/cleanup-preview/action.yml), used by
both cleanup paths.

### Branch previews

Every push to a non-`main` branch that passes CI gets its own deployment:

```text
https://karstendick.github.io/nonogram/preview/<branch-name>/
```

Slashes in branch names are converted to hyphens, so `feature/drag` is deployed to
`.../preview/feature-drag/`. The preview URL is emitted as a workflow notice on the
"Deploy Preview" run. Previews are deleted automatically when the branch is deleted
(including on PR merge).

**Previews do not cache.** Previews live under `/nonogram/preview/`, which is inside the
production service worker's `/nonogram/` scope, so the two would otherwise fight: the
production worker would answer preview navigations from its own precache and serve a
stale app under a preview URL. Two settings in [vite.config.ts](vite.config.ts) keep
them apart — the production worker has a `navigateFallbackDenylist` for `/preview/`, and
preview builds use `selfDestroying`, which ships a service worker whose only job is to
unregister itself and delete its caches. Deleting the file instead would not be enough:
a device that already registered a preview worker keeps it, so previews need a worker
that actively cleans up ([Workbox guidance on removing a service
worker](https://developer.chrome.com/docs/workbox/remove-buggy-service-workers)).

A consequence is that previews are not installable and have no offline support, so PWA
behavior itself can only be reviewed on production or from a local `npm run build &&
npm run preview`.

### Notes

- Deploys are gated on CI passing — they use `workflow_run` rather than running in the
  same workflow, so a red CI run never publishes.
- The base path is injected at build time via the `VITE_BASE_PATH` environment variable
  (see [vite.config.ts](vite.config.ts)); it defaults to `/nonogram/` locally.
- All deploy jobs push to `gh-pages` with the built-in `GITHUB_TOKEN` and
  `contents: write` — no extra secrets to configure.
