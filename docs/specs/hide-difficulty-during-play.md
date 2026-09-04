# Hiding Difficulty During Play

> **Source:** [issue #24 — Hide technique and number of deductions until puzzle completion](https://github.com/karstendick/nonogram/issues/24).
> The issue is a title with no body; the scope below was read off the code and settled in
> conversation.

## Context

The game header shows the puzzle's measured difficulty the whole time you are playing.
[RatingBadge](../../src/components/RatingBadge.tsx) renders whatever
[`describeRating`](../../src/logic/generation/levels.ts) returns, and that is:

```
needs segment partitioning · 80 deductions
```

Both halves give away something the player is meant to work out:

- **The technique** is the solver's own vocabulary for the hardest step the puzzle requires. Being
  told a puzzle needs segment partitioning tells you what to go looking for, which is most of the
  difficulty of a hard nonogram.
- **The deduction count** is a progress bar nobody asked for. It says how much work the puzzle holds,
  so a player two thirds of the way in knows it.

The badge appears in three places: the mobile header ([App.tsx:185](../../src/App.tsx#L185)), the
desktop header ([App.tsx:204](../../src/App.tsx#L204)), and the pre-made puzzle picker
([PuzzleSelector.tsx:39](../../src/components/PuzzleSelector.tsx#L39)).

The reveal at the end already exists and needs no work:
[SolveStats](../../src/components/SolveStats.tsx) prints "Solving it by pure logic takes N
deductions, the hardest being X" in the completion modal, next to the player's own move count.

## Requirements

1. While a puzzle is unsolved, the game header does not show the technique it requires or its
   deduction count.
2. Once the puzzle is solved, both are shown, as they are today.
3. The pre-made picker is unchanged — see the design decision below.
4. The header does not become a blank space: it still says how hard the puzzle is, in the terms the
   player chose it by.

## Design Decisions

### The header shows the level name while playing, and the full rating once solved

`Easy / Medium / Hard / Evil`, from
[`levelForRating`](../../src/logic/generation/levels.ts), which already derives a level from a
rating and so works for pre-mades too — they carry a rating but were never generated at a level.

The alternative was to show nothing at all until completion. The level name wins on two counts:

- It is not new information. The player picked the level on the landing page, and every level's
  plain-language hint ("Assume, then prove yourself wrong") is printed on the selector they picked
  it from. Echoing their own choice back is not a spoiler.
- A blank header would leave the e2e suite with no way to confirm a puzzle generated at the
  requested level, short of solving it. `Difficulty: Evil` proves exactly what
  `Difficulty: needs contradiction` proved.

### This hides vocabulary and workload, not the difficulty class

Worth being straight about: a level maps one-to-one onto a rung of the technique ladder, so "Evil"
and "needs reasoning by contradiction" are the same fact in different words. Showing the level does
not hide which technique the puzzle tops out at.

What it does hide is the solver's name for that technique — which reads as an instruction — and the
deduction count, which has no counterpart in anything the player chose. That is the useful part of
the issue, and the part worth having.

### The pre-made picker keeps the full rating

There, the rating is how you choose: the list exists to be compared across, and the difficulty spec
([puzzle-difficulty.md](puzzle-difficulty.md)) reports both axes precisely so a player can tell a
long grind from a short nasty one. Nothing is being spoiled before it is chosen — the spoiler is
seeing it for the next hour while you work.

### `RatingBadge` takes a `reveal` prop rather than the callers branching

One component, so the two headers cannot drift apart, and so the `aria-label` stays a single phrase
in both states. It defaults to revealing, which leaves `PuzzleSelector` untouched; the headers pass
`reveal={isComplete}`.

### The badge appears during the replay

`isComplete` is already true while the solve replays, before the completion modal, so the full
rating comes back a moment before the modal states it. That is correct: the puzzle is solved by
then.

## Implementation Plan

1. **`src/components/RatingBadge.tsx`** — add `reveal?: boolean`, defaulting to `true`. When false,
   render the level name from `levelForRating`, with an `aria-label` of `Difficulty: <level>`. When
   true, behave exactly as now.
2. **`src/App.tsx`** — pass `reveal={isComplete}` at both header call sites. `isComplete` is already
   destructured from the store there.
3. **Tests** — as below.

`PuzzleSelector`, `SolveStats`, `CompletionModal` and `describeRating` are untouched.

## Test Plan

**`tests/RatingBadge.test.tsx`** (new)

- With `reveal` false, shows the level name and neither the technique nor the deduction count.
- With `reveal` true, shows both readings, as today.
- A rating below the completion rung still names a level rather than rendering blank —
  `levelForRating` folds those into Easy.

**`tests/App.test.tsx`**

- An unsolved puzzle's header does not contain the deduction count.
- The full rating is in the header once the puzzle is complete.

**`e2e/difficulty.spec.ts`**

Two assertions in the game view key on the hidden text and move to the level name:

- "offers difficulty levels and generates a puzzle at the chosen one" — `Difficulty: Hard`.
- "generating the hardest level keeps the page responsive" — `Difficulty: Evil`, which proves what
  `needs contradiction` proved.

"premade puzzles show their measured ratings" asserts against the picker and stays as it is — it is
now the test that keeps requirement 3 honest.

## Implementation notes (as built)

Built as planned. The in-game e2e assertion also checks the count of the revealed label and of the
word "deductions" is zero, rather than only checking the level name is present — the level name
showing up is not by itself evidence the rest is gone.

Unrelated but worth knowing before running the suite: `e2e/difficulty.spec.ts` is flaky under the
full parallel run. "generating the hardest level keeps the page responsive" times out waiting 30s for
the board, because Evil generation is the slowest thing the app does and five workers are competing
for the CPU. Confirmed to predate this change — on a clean tree the same file failed two tests, on
different projects again. The failure is always the board never arriving, never an assertion about
the badge.

## Open Questions

- Should the header show nothing at all while playing, rather than the level name? Default: the
  level name, for the two reasons above. _Resolved: the level name._
- Should the pre-made picker also hide the rating until a puzzle is solved? Default: no — there, the
  rating is the basis for choosing. _Resolved: no, the picker keeps it._
