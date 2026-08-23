# Solve Replay Animation

> **Source:** no ticket — written from an idea raised in conversation.

## Context

Today, solving a puzzle immediately pops the
[CompletionModal](../../src/components/CompletionModal.tsx) ("Puzzle Complete! Congratulations! You
solved the puzzle in N moves."). The finished picture is right there behind the modal, but nothing
shows _how_ the player got there.

The idea: after winning, animate the solve — replaying each cell in the order the player marked it,
so the picture assembles itself the way the player built it.

The game store ([gameStore.ts](../../src/store/gameStore.ts)) currently keeps only the _current_
grid state (`playerGrid`) and a `moves` counter. There is no move history of any kind, so the
ordering information the animation needs does not exist yet and has to be recorded as the player
plays.

## Requirements

1. When a player completes a puzzle, a replay animation plays automatically before the completion
   modal appears.
2. The replay starts from an empty grid and marks cells one at a time, in the order the player
   marked them.
3. The replay includes both fills and X-marks, interleaved in the order they were made — the
   X-marks are what make the solve legible as deduction rather than cells appearing at random.
4. The replay is a cleaned-up history, not a literal one: marks the player later erased, and
   mistakes they later corrected, do not appear. Only what survived into the final solved grid is
   replayed, at the point the surviving mark was made.
5. The replay is autoplay-only: no pause, speed, or scrubbing controls.
6. The player can skip the replay; skipping goes straight to the completion modal.
7. When the replay ends (naturally or by skipping), the completion modal appears exactly as it does
   today. The replay's final frame is identical to the real player grid, so the handoff is seamless.
8. Replay must survive a page reload mid-puzzle: a puzzle started before a reload and finished after
   it still replays correctly. (Game state already persists to `localStorage` via zustand
   `persist`.)
9. Puzzles already in progress or already completed from _before_ this feature ships have no
   recorded history; they must not crash and must not attempt a replay.
10. The completion modal gets a **Watch Again** button that replays the solve on demand, as many
    times as the player wants.
11. A dev-only tuning panel makes the animation's timing values adjustable in the browser, so they
    can be settled by feel rather than by guessing numbers in a spec.

## Design Decisions

### What gets recorded

Record an append-only **mark log**: every time a cell transitions into `CellState.Filled` or
`CellState.MarkedEmpty`, append that cell and its new state. Erases (transitions to `Empty`) are not
recorded — a cell that ends up empty contributes nothing to the replay, and the dedupe rule below
handles the erase-then-remark case without needing them.

Each entry packs into a single number — `(row * width + col) * 2 + (state === MarkedEmpty ? 1 : 0)`
— to keep the persisted `localStorage` payload small. A 15×15 solve is at most a few hundred
numbers. Pack/unpack live next to the replay logic, not in the store.

Every code path that marks cells appends: `setCellState`, `startDrag`, `continueDrag`, and
`markMultipleCells` (the row/column clue-click auto-marking, which writes a batch of `MarkedEmpty`
cells — those are real player actions and belong in the replay, appended in the order given).

### Turning the log into a replay sequence

The log is raw and can contain a cell more than once (fill → erase → X-mark, or a mistake later
corrected). The replay sequence is derived from it by a pure function:

- Drop cells that are `Empty` in the final grid.
- Keep only entries whose recorded state matches that cell's final state.
- For each cell, keep its **last** such entry — the mark that stuck.
- Order by the position of that entry in the log.

_Rationale:_ an earlier mark on a cell that was later changed was a false start; the mark that
survived is the one that belongs in "the order you solved it". Deriving at replay time (rather than
maintaining a deduped structure as the player plays) keeps the recording path trivial and puts the
interesting logic in one testable pure function.

Because every non-empty cell of the final grid appears exactly once, the last frame of the replay
equals `playerGrid` exactly — no visual jump when the replay hands off to the modal.

### Replay does not mutate game state

The animation renders a **derived display grid**, computed from the puzzle + replay sequence +
current step. `playerGrid` is never touched. Mutating and then restoring it would write intermediate
states to `localStorage` and would re-trigger `checkSolution` on every frame.

Plumbing: `GameBoard` and `Grid` take an optional `displayGrid` prop (defaulting to the store's
`playerGrid`) and an `interactive` flag. During replay the grid renders from `displayGrid`, cells
ignore mouse/touch/keyboard input, and clue-click auto-marking is disabled. Clue "complete"
strike-through highlighting derives from `displayGrid` too, so clues light up progressively as the
replay completes their row/column.

_Rationale:_ two levels of optional prop drilling (App → GameBoard → Grid) keeps transient replay
state out of the persisted store and makes the replay rendering directly testable by passing a grid.

No cell in the replay can render in the red "mistake" styling: the puzzle is solved, so every
replayed mark matches the solution by construction.

### Timing

Total replay duration is capped rather than using a fixed per-cell delay, so a 5×5 and a 15×15 take
roughly the same time — which matters more now that X-marks roughly double the step count. Per-step
interval = `clamp(TOTAL_MS / steps, MIN_MS, MAX_MS)` with `TOTAL_MS ≈ 4000`, `MIN_MS ≈ 20`,
`MAX_MS ≈ 120`.

The animation is driven by `requestAnimationFrame`, mapping elapsed time to a step index
(`floor(elapsed / interval)`), not by `setInterval` per cell. This avoids timer drift and correctly
advances multiple cells in one frame when the interval is below frame time.

After the last cell, hold on the completed picture for ~600ms before handing off to the modal.

These four numbers — total duration, min interval, max interval, and end hold — plus the per-cell
fade duration are the animation's entire feel. They live as named constants and are passed into the
replay as overridable props, which is what makes the tuning panel below possible.

### Dev-only tuning panel

Every timing value above is a guess until it is on screen, so a small panel of sliders renders
alongside the replay, gated on `import.meta.env.DEV`. It is stripped from production builds by Vite,
so players never see it and it costs nothing in the shipped bundle.

Sliders: total duration, min interval, max interval, end hold, and per-cell fade duration. The panel
also gets a **Replay** button, so values can be changed and re-watched immediately without solving a
puzzle again — that loop is the whole point of the panel.

The panel starts collapsed as a corner pill: expanded, it covers the Skip button on a phone-sized
screen and swallows the taps. It remembers being opened, so desktop tuning is one click away.

Slider values are held in React state and passed to the replay as props, overriding the constants.
They persist to `localStorage` under a dev-only key so a page reload doesn't reset a tuning session.
Nothing about the panel touches the shipped defaults: once the numbers feel right, they get written
back into the constants by hand, and the panel stays for the next time.

### Skipping and reduced motion

- A visible **Skip** button ends the replay immediately and shows the modal. It is the _only_ way
  to skip — tapping the board does nothing. The player mostly plays on mobile, where a tap-anywhere
  affordance would make accidental skips easy.
- If the puzzle has no usable sequence (empty log, or a save from before this feature), the replay
  is skipped entirely and the modal shows as it does today.
- If the browser reports `prefers-reduced-motion: reduce`, the replay is skipped entirely.

### Re-watching from the completion modal

The completion modal gains a **Watch Again** button, placed below "Play Another" and above "Admire
Puzzle". Pressing it hides the modal, replays the solve exactly as the automatic replay does, and
brings the modal back when the replay finishes or is skipped. It can be pressed any number of times.

The button is hidden when there is nothing to watch — an empty sequence, or a save recorded before
this feature shipped.

Reduced motion is treated differently here: `prefers-reduced-motion: reduce` suppresses the
_automatic_ replay, but Watch Again is an explicit request for the animation, so it plays normally.
The setting is about unrequested motion, not about withholding a feature the player asked for.

### Trigger

`App` watches `isComplete` for a false → true transition **within the session** (via a ref holding
the previous value) and starts the replay then. Loading the app with an already-completed persisted
puzzle does not replay — that path already sends the user to the landing page.

## Implementation Plan

1. **`src/logic/replay.ts` (new)** — pure helpers, no React:
   - `encodeMark` / `decodeMark` — the `index * 2 + bit` packing.
   - `buildReplaySequence(markLog, playerGrid, width)` → ordered array of `{row, col, state}`
     applying the final-state / last-entry rules.
   - `buildReplayGrid(width, height, sequence, step)` → `CellState[][]` with the first `step` marks
     applied and everything else `Empty`.
   - `stepIntervalMs(stepCount)` → the clamped per-step interval.
2. **`src/store/gameStore.ts`** — add `markLog: number[]` to state and to `partialize`; append in
   `setCellState`, `markMultipleCells`, `startDrag`, and `continueDrag` when a cell becomes `Filled`
   or `MarkedEmpty`; reset in `loadPuzzle`; default to `[]` when merging a persisted state that
   lacks the field.
3. **`src/components/Grid.tsx`** — accept optional `displayGrid` and `interactive` props; render
   from `displayGrid ?? playerGrid`; when `interactive === false`, pass no-op handlers to `Cell` and
   drop the drag/pointer wiring and `cursor-pointer` affordance.
4. **`src/components/GameBoard.tsx`** — accept the same optional props, use `displayGrid` for
   `isRowComplete` / `isColComplete`, disable clue click/keyboard handlers when not interactive, and
   forward both props to `Grid`.
5. **`src/components/SolveReplay.tsx` (new)** — owns the `requestAnimationFrame` loop and the
   current step, renders the Skip control, and calls `onFinished` after the final hold or on skip.
   Reports finished immediately (rendering no animation) if the sequence is empty or reduced motion
   is preferred.
6. **`src/components/CompletionModal.tsx`** — add `onWatchReplay: () => void` and
   `canWatchReplay: boolean` props; render the "Watch Again" button between "Play Another" and
   "Admire Puzzle" when `canWatchReplay`, disabled alongside the others while a new puzzle is
   generating.
7. **`src/App.tsx`** — track `replayPhase: 'idle' | 'playing' | 'done'`; start on the `isComplete`
   false → true transition, and again whenever "Watch Again" is pressed (`done` → `playing`); while
   `playing`, render `GameBoard` with the replay's display grid and `interactive={false}` and do not
   render `CompletionModal`; on finish, render the modal as today. Pass `canWatchReplay` (sequence is
   non-empty) down to the modal, and force the replay to run on a Watch Again even when reduced
   motion is preferred. Reset to `idle` whenever a new puzzle is loaded.
8. **`src/index.css`** — a short fade/scale keyframe for a mark appearing, in the style of the
   existing `animate-scale-in`, with its duration driven by a CSS custom property so the tuning
   panel can vary it.
9. **`src/components/ReplayTuner.tsx` (new)** — the slider panel plus its Replay button, rendered by
   `App` only when `import.meta.env.DEV`. Owns the override values, persists them to `localStorage`
   under a dev-only key, and passes them into `SolveReplay`. Timing props on `SolveReplay` default
   to the constants in `replay.ts`, so nothing changes when the panel is absent.

## Test Plan

Unit (Vitest, `tests/`):

- **`tests/replay.test.ts` (new)** — `buildReplaySequence`: orders fills and X-marks interleaved by
  when they were made; drops cells empty in the final grid; a cell marked then erased then re-marked
  uses its _last_ entry; a cell X-marked early but filled later appears once, as a fill, at the fill's
  position; empty log → empty sequence. `buildReplayGrid`: step 0 → all `Empty`; step n → first n
  marks applied with the right states; step ≥ length → grid equals the final player grid.
  `encodeMark`/`decodeMark` round-trip. `stepIntervalMs`: clamps at both ends.
- **`tests/gameStore.test.ts`** — extend: marks recorded by `setCellState`, `startDrag`, a drag
  across a row via `continueDrag`, and a clue-click batch through `markMultipleCells`; erases not
  recorded; `loadPuzzle` clears the log; `markLog` is included in `partialize`; a persisted state
  without `markLog` rehydrates to `[]`.
- **`tests/GameBoard.test.tsx` / `tests/Grid.test.tsx`** — extend: with `displayGrid` supplied, the
  rendered cells reflect it rather than the store; with `interactive={false}`, clicking a cell does
  not change `playerGrid` and clicking a completed clue does not auto-mark.
- **`tests/SolveReplay.test.tsx` (new)** — with fake timers / a stubbed `requestAnimationFrame`: the
  step advances over time and `onFinished` fires after the final hold; the Skip control fires
  `onFinished` immediately; an empty sequence reports finished without rendering; a stubbed
  `matchMedia` reporting `prefers-reduced-motion: reduce` reports finished without animating, but
  animates normally when the replay was explicitly requested via Watch Again.
- **`tests/SolveReplay.test.tsx`** — also assert the timing props override the defaults: a replay
  given a shorter total duration finishes in fewer simulated frames than one using the constants.
  The panel itself is dev-only and needs no test of its own beyond that; production builds do not
  include it, so it stays out of the E2E runs.
- **`tests/CompletionModal.test.tsx`** — extend: "Watch Again" renders and calls `onWatchReplay`
  when `canWatchReplay` is true, and is absent when it is false; the existing buttons are
  unaffected. Add an App-level assertion that the modal is absent while the replay is playing and
  present again after it finishes, including after a Watch Again.

E2E (Playwright, `e2e/replay.spec.ts` new): open a small pre-made puzzle (`house`, 5×5), solve it by
clicking cells via the existing `data-row` / `data-col` attributes (including a few X-marks), then
assert the replay UI appears and the completion modal is not yet visible; assert the modal appears
after the replay finishes; then click "Watch Again" and assert the replay runs a second time and the
modal returns afterwards. In a second case, click Skip and assert the modal appears immediately.

Run `npm run validate` (lint + format check + type-check + unit tests with coverage) and
`npm run test:e2e` before calling this done.

## Open Questions

1. **Re-watch.** The chosen flow is "plays automatically on win", so there is currently no way to see
   the replay a second time. Should the completion modal also get a "Watch again" button? _Resolved:
   yes — the modal gets a "Watch Again" button. Now in scope; see "Re-watching from the completion
   modal"._
2. **Hold duration and total duration.** ~600ms hold and a ~4s total are starting values; may want
   tuning once it's on screen. _Resolved: the values stay open on purpose — a dev-only slider panel
   (see "Dev-only tuning panel") settles them by feel after the animation exists, and the chosen
   numbers get written back into the constants._
3. **Skip affordance.** Spec assumes a visible Skip button. Should tapping anywhere on the board also
   skip? (Riskier on mobile — easy to skip by accident.) _Resolved: the Skip button is sufficient;
   tapping the board does nothing. The player mostly plays on mobile, where tap-anywhere would make
   accidental skips easy._
