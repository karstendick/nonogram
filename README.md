# Nonogram Puzzle Game

A web-based nonogram puzzle game built with TypeScript, React, and Vite.

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

## CI/CD

Everything runs on GitHub Actions and deploys to GitHub Pages from the `gh-pages`
branch. There is no separate hosting provider — production and all branch previews
live in the same `gh-pages` branch, production at the root and previews under
`preview/<branch-name>/`.

- **Production:** https://karstendick.github.io/nonogram/
- **Preview index:** https://karstendick.github.io/nonogram/preview/

### Pipeline overview

```
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

```
https://karstendick.github.io/nonogram/preview/<branch-name>/
```

Slashes in branch names are converted to hyphens, so `feature/drag` is deployed to
`.../preview/feature-drag/`. The preview URL is emitted as a workflow notice on the
"Deploy Preview" run. Previews are deleted automatically when the branch is deleted
(including on PR merge).

### Notes

- Deploys are gated on CI passing — they use `workflow_run` rather than running in the
  same workflow, so a red CI run never publishes.
- The base path is injected at build time via the `VITE_BASE_PATH` environment variable
  (see [vite.config.ts](vite.config.ts)); it defaults to `/nonogram/` locally.
- All deploy jobs push to `gh-pages` with the built-in `GITHUB_TOKEN` and
  `contents: write` — no extra secrets to configure.
