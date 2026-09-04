# Auto-X on Completion

> **Source:** [issue #15 — Replay has missing X's](https://github.com/karstendick/nonogram/issues/15)

## Context

A puzzle is won as soon as the picture is right, regardless of what the player did with the cells
that stay empty. `checkSolution` ([gameStore.ts](../../src/store/gameStore.ts)) compares only fills:
every solution-filled cell must be `Filled`, and no other cell may be `Filled`. Whether the empty
cells carry an X is irrelevant to winning.

Most players don't X every empty cell. Some X almost nothing and solve by fills alone. So the
winning grid routinely has blank cells scattered through it — which is fine while playing, but the
replay then assembles a picture full of holes.

The replay is the visible symptom.
[`buildReplaySequence`](../../src/logic/replay.ts) replays only marks that survived into the final
grid; a cell that was never marked has no entry in the log and nothing to replay. There is no bug in
the replay code — it is faithfully replaying a grid that has holes in it.

## Requirements

1. When a puzzle is completed, every cell still `Empty` becomes `MarkedEmpty`.
2. The X's land in the player's grid, not only in the replay. The replay's final frame stays
   identical to the real player grid, as it is today.
3. In the replay, the auto-placed X's appear after every mark the player made.
4. They do not count as moves. The completion stat is unchanged by them.
5. A player who already X'd every empty cell sees no change at all.
6. Puzzles completed before this ships are not retro-filled; they replay exactly as they do now.

## Design Decisions

### The fill happens on the completion transition, inside `checkSolution`

`checkSolution` is the one place that decides a puzzle is won, and it is already called from all
three mutation paths (`setCellState`, `markMultipleCells`, `endDrag`). Doing the fill there means
every path that can win gets it, with no fourth call site to keep in sync.

It fires only on the rising edge — `isComplete` false → true — so re-running `checkSolution` on an
already-complete puzzle appends nothing. Requirement 6 falls out of this for free: a puzzle restored
from `localStorage` with `isComplete` already `true` never crosses the edge.

### The X's go into `playerGrid`, not just into the replay sequence

Two reasons, one of them structural:

- `buildReplaySequence` drops any logged mark that disagrees with the final grid. An X that exists
  only in the log and not in the grid would be filtered straight back out. Writing the grid is what
  makes the marks replayable at all.
- The replay is specified to end on a frame identical to the real board
  ([solve-replay-animation.md](solve-replay-animation.md), requirement 7). Filling only the replay
  would break that handoff — the animation would finish on a complete picture and then cut to a
  board with holes in it behind the modal.

Filling the grid also just reads as correct: the puzzle is solved, so those cells _are_ known empty.

### They do not increment `moves`

`moves` is not decoration. [SolveStats](../../src/components/SolveStats.tsx) divides the puzzle's
required deduction count by it to show an efficiency percentage, and the two counts are only
comparable because both mean "one act of reading a line and marking what follows". Machine-placed
X's are not that. Charging the player for them would dent the efficiency score of exactly the
players who solved most directly.

### Within the batch, the X's are ordered row-major

They are appended to `markLog` in reading order — left to right, top to bottom — so the replay ends
with a sweep across and down the board rather than a scatter. `buildReplaySequence` orders by
position in the log, so appending them last is what puts them last (requirement 3).

### None of the auto-placed X's can be a mistake

[Cell](../../src/components/Cell.tsx) paints an X red when it sits on a cell the solution fills. At
completion, every solution-filled cell is already `Filled`, so no remaining `Empty` cell can be one.
The batch can never introduce a red mark.

### The replay gets slightly faster, and ends on a flourish

`stepIntervalMs` derives the per-mark delay from `sequence.length` against a fixed total duration,
so a longer sequence means a shorter interval. Adding a batch of X's therefore speeds the whole
replay a little rather than extending it. That is the intended trade — the total stays at
`REPLAY_TIMING.totalMs` and the tail becomes a fast sweep of X's filling in the background.

## Implementation Plan

1. **`src/store/gameStore.ts`** — in `checkSolution`, when `isCorrect` is true and the current
   `isComplete` is false, build the completed grid (every `Empty` → `MarkedEmpty`) and the extended
   `markLog` (one `encodeMark` per filled cell, row-major), and commit them in the same `set` as
   `isComplete: true`. Leave `moves` alone. When `isCorrect` is false, or the puzzle was already
   complete, behave exactly as today.
2. **Tests** — as below.

No component changes. `App`, `SolveReplay` and `GameBoard` already render whatever the grid and the
sequence contain.

## Test Plan

**`tests/gameStore.test.ts`**

- Completing a puzzle leaves no `Empty` cell in `playerGrid`.
- The auto-placed X's are appended to `markLog`, after the mark that completed the puzzle.
- `moves` is unchanged by the fill: solving with N moves still reports N.
- A puzzle completed with every empty cell already X'd gains no new log entries.
- `checkSolution` called again on an already-complete puzzle appends nothing (idempotent).
- Existing tests in the `auto-check solution` and `checkSolution` blocks that assert on grid
  contents after a win need reviewing — the grid they inspect now has X's in it.

**`tests/replay.test.ts`**

- A sequence built from a completed puzzle covers every cell of the grid exactly once.
- The auto-placed X's are the tail of the sequence, after every player mark.

**`e2e/replay.spec.ts`**

- Solve a puzzle by fills only, and assert the replay's final frame has no blank cells.

## Open Questions

- Should the auto-placed X's be visually distinguished from the player's own marks during the
  replay — dimmer, or swept in as one gesture rather than mark-by-mark? Default: no, they animate
  identically. _Resolved: no difference — they animate exactly as the player's own marks do._
- Should the batch be ordered by something more expressive than reading order (say, the order the
  rows were completed)? Default: row-major, for a legible sweep. _Resolved: row-major._
