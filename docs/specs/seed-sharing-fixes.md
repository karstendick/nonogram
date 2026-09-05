# Seed Sharing: One Token That Round-Trips

> **Source:** two issues, taken together because one decides the other —
> [#17 — Difficulty levels are only calibrated for 15×15, but seed entry offers 5×5 and 10×10](https://github.com/karstendick/nonogram/issues/17)
> and
> [#20 — Sharing a seed no longer reproduces the same puzzle (level is not part of the shared token)](https://github.com/karstendick/nonogram/issues/20).
> Branch: `seed-fixes`. The choice of option 1 for #17 was settled in conversation; see the design
> decision below.

## Context

A generated puzzle is determined by three inputs: `generatePuzzle(size, seed, levelId)` in
[puzzleGenerator.ts](../../src/logic/puzzleGenerator.ts). The level picks the pattern-generator
presets from [levels.ts](../../src/logic/generation/levels.ts), so the same seed at a different level
is a different grid. The sharing UI never caught up with that, which leaves two defects that meet in
the same file.

**Size is offered but was never calibrated (#17).** The knob presets behind each level — fill ratio
and smoothing rounds — were measured at 15×15 only, as
[puzzle-difficulty.md](puzzle-difficulty.md) says outright. Quick Play is 15×15 and is unaffected:
[service.ts](../../src/logic/generation/service.ts) hardcodes `size: 15` in both the worker request
and the no-worker fallback. But [PuzzleGenerator.tsx](../../src/components/PuzzleGenerator.tsx)
still offers 5×5 / 10×10 / 15×15 and passes the choice straight through to a target calibrated for a
different one. Some level/size pairs are probably unreachable — a 5×5 needing contradiction may not
exist for most seeds — and when generation cannot hit the band it returns its nearest miss and
reports that puzzle's real rating. Honest, but the player asked for Evil and quietly got something
else.

**The shared token carries only the seed (#20).** `finish()` in
[strategies/index.ts:72](../../src/logic/generation/strategies/index.ts#L72) sets `puzzle.id = seed`
— deliberately the seed that was asked for, not whichever candidate seed won, so that sharing works.
`SeedDisplay` in [App.tsx:16](../../src/App.tsx#L16) then shows and copies that id, and the entry
form defaults to Medium. So copying an Evil puzzle's seed and sending it hands the recipient a
Medium puzzle, silently. The issue verified it: `generatePuzzle(15, 'shared-seed', 4)` and
`generatePuzzle(15, 'shared-seed', 2)` have different solutions.

The two meet in `PuzzleGenerator.tsx`, and #17's answer decides #20's token format: with seed entry
restricted to 15×15 there is no size segment to encode, parse or validate, and the token is the
`shared-seed@4` shape #20 proposed.

Two notes on ground truth, since both issues gesture at things that do not exist:

- There is no URL handling anywhere in `src/`, and no `plan.md` in the repo — #20's reference to
  "the Phase 10 notes in `plan.md`" points at a file that is gone. URL sharing stays out of scope
  and is not being designed here; the token is a string on the clipboard.
- The Quick Play seed is a generated UUID (`randomSeed()` in `service.ts`), so the token the player
  copies is already 36 characters. `@4` makes it 38.

## Requirements

1. The seed entry form generates 15×15 puzzles only. The size selector is gone.
2. The string `SeedDisplay` copies is everything needed to reproduce the puzzle: seed **and** level.
3. Pasting that string into the seed form reproduces the same puzzle — same solution, same clues.
4. This holds for Quick Play puzzles as well as ones generated from the form; Quick Play is where
   most shared puzzles come from.
5. A bare seed with no level suffix still works, and produces what it produced before this change.
6. A puzzle resumed from a session that predates this change does not display a wrong level.
7. The token records the level that was **requested**, not the level the resulting puzzle was
   measured at. See below — these differ, and only the first one round-trips.

## Design Decisions

### #17 resolves as option 1: seed entry is 15×15

Of the three options in the issue, this is the one that makes the combined change small and leaves
nothing half-calibrated:

- 15×15 is the size the whole difficulty feature was measured at and the only size Quick Play
  offers. Restricting the form makes the app's one generated size consistent, rather than having a
  second path into presets that were never tuned for it.
- It removes the silent-substitution problem in #17 outright instead of papering over it with a
  warning (option 3) or committing to per-size calibration and reachability tables (option 2).
  `npm run calibrate` does take `CALIBRATE_SIZE`, so option 2 stays cheap to revisit later — this
  decision is reversible, and nothing here is designed to block it.
- It makes the shared token two-part rather than three-part.

The cost is real and worth stating: 5×5 and 10×10 generated puzzles are no longer reachable from the
UI at all. The pre-made collection still spans 5×5 to 15×15, so small grids do not disappear from
the app — only from the generator.

`generatePuzzle(size, seed, levelId)` **keeps its size parameter**. It is a logic-layer API used by
[puzzleGenerator.test.ts](../../src/logic/puzzleGenerator.test.ts) and reachable from the
calibration scripts; option 2 would need it back. Only the UI is constrained, and it always passes 15.

### The token is `seed@levelId`

`shared-seed@4`, as #20 proposed. The numeric id rather than the level name (`shared-seed@evil`)
because the id is already the app's durable handle for a level: it is what `lastLevelId` persists to
localStorage and what `levelById` looks up. A name would read better aloud, but it introduces a
second spelling of the same thing and a case-sensitivity question, for a string that is copied and
pasted rather than typed.

**Parsing rule:** split on the **last** `@`. Treat the suffix as a level only if it parses to an
integer matching a level in `LEVELS`. Otherwise the whole string is the seed. This means a seed that
legitimately contains `@` — `me@example.com` — still works, and so does `puzzle@home`, and so does
`seed@9` if a ninth level never exists. Nothing a player could previously type stops working.

### The level in the token is the level that was asked for

This is the part that is easy to get wrong. `levelForRating(puzzle.rating)` would derive a level from
the measured rating without threading anything new through the app — but it derives the **achieved**
level, and generation returns its nearest miss when the budget runs out without landing in the band
(`inBand: false`). Ask for Evil, get a puzzle measured at Hard, and a rating-derived token would say
`@3` — which regenerates with Hard's presets and produces a **different puzzle**. The token has to
carry the requested level or requirement 3 fails exactly in the cases people most want to share.

So the requested level is threaded through to the puzzle: **add `levelId?: number` to `Puzzle`**
([types/index.ts](../../src/types/index.ts)), set in `finish()` from `target.rung` via
`LEVELS.find((level) => level.rung === target.rung)` — the same one-to-one rung-to-level lookup
`presetFor()` already relies on.

Putting it on `Puzzle` rather than in the store means it rides along with the existing
`persist`-ed `currentPuzzle` for free: a puzzle resumed after a reload still knows its level, with no
new persisted field and no migration.

The field is optional because pre-made puzzles have no level and never had one — `isGeneratedPuzzle`
keys off the title, so nothing else changes shape.

### `puzzle.id` stays the bare seed

The alternative was to set `id` to the token in `finish()`, so `SeedDisplay` needed no change at all.
Rejected: `id` is also the persistence identity (`GameState.puzzleId`) and the value
`PuzzleSelector` compares against for pre-mades. Overloading it with a difficulty suffix makes one
field mean two things, and a `levelId` beside it costs a line. The comment at
`strategies/index.ts:70` explaining that the id is the requested seed stays true.

### A puzzle with no `levelId` shows a bare seed

Requirement 6. A puzzle persisted before this change has no `levelId`, and guessing one from its
rating would be wrong for precisely the nearest-miss puzzles described above. So `SeedDisplay` shows
the seed alone when the level is unknown — which is exactly what it does today, and which still
round-trips as a bare seed under requirement 5.

### `SeedDisplay` shows the same string it copies

No hidden divergence between the visible text and the clipboard: if the button reads
`Seed: shared-seed@4`, that is what gets copied. The player can read a token off a screenshot or
retype it from a photo, and there is nothing to explain about why the copy is longer than the label.

### A pasted token owns the difficulty selector

When the seed field's contents parse to a valid `seed@level`, the level selector jumps to that level
and is disabled, with a line of text saying the level came from the pasted seed. Editing or removing
the suffix re-enables it.

The alternative — set the selector and leave it editable — allows a state where the field says `@4`
and the selector says Hard, which is a straight contradiction about what the Generate button will
do. Disabling makes the token authoritative and says so. (A third option, rewriting the input to
strip the suffix on blur, is in Open Questions; it edits what the player typed, which is the reason
it is not the default.)

### Bare seeds keep generating at Medium

`DEFAULT_LEVEL_ID` is 2 and the form already defaults to it, so a bare seed produces today's puzzle
for today's seed — old shares from before this change still resolve to the same grid they did.

### Size is out of the token, not reserved in it

No placeholder segment, no `seed@4@15`. If option 2 for #17 ever lands, the format gains a segment
then, and the parsing rule above ("suffix must be a valid level, else it is all seed") is what makes
that a compatible extension rather than a break.

## Implementation Plan

1. **`src/types/index.ts`** — add `levelId?: number` to `Puzzle`, documented as the level that was
   _requested_, and why that is not the same as the level it was measured at.

2. **`src/logic/generation/strategies/index.ts`** — in `finish()`, set `levelId` on the returned
   puzzle from `target.rung`. Extend the existing comment there: the id is the requested seed and
   the levelId is the requested level, for the same reason.

3. **`src/logic/seedToken.ts`** (new) — the format in one place, both directions:
   - `formatSeedToken(seed: string, levelId?: number): string` — `seed@levelId`, or the bare seed
     when `levelId` is undefined.
   - `parseSeedToken(input: string): { seed: string; levelId: number | null }` — last-`@` split,
     suffix accepted only if it names a level in `LEVELS`, otherwise the whole input is the seed.

4. **`src/components/PuzzleGenerator.tsx`** —
   - Delete the size selector and the `size` state; call `generatePuzzle(15, seed, levelId)`.
   - Parse the field on change. A valid token sets the level and disables `LevelSelector` with a
     short explanation; generation uses the parsed seed with the suffix stripped.
   - Keep the input's label as `Seed` — eight e2e call sites use `getByLabel('Seed')`, and a token is
     a seed with a suffix. Update the helper text under it to mention 15×15 and that a shared token
     with a level works here.

5. **`src/App.tsx`** — `SeedDisplay` takes the puzzle (or a seed and an optional level) and renders
   `formatSeedToken(...)` in both the mobile and desktop headers
   ([App.tsx:195](../../src/App.tsx#L195), [App.tsx:216](../../src/App.tsx#L216)). The `title`
   attribute becomes "Click to copy" wording that covers the level.

6. **`src/logic/puzzleGenerator.ts`** — update the doc comment: a puzzle is identified by seed and
   level, and the UI generates at 15×15 only. The signature is unchanged.

7. **`README.md`** — the "Shareable puzzles" bullet (line 43) says "every generated puzzle has a seed
   you can copy". Make it say the copied token carries the difficulty too.

Not touched: `service.ts` (already 15×15), the worker, `LevelSelector`, `RatingBadge`,
`PuzzleSelector`, the pre-made collection, and `levelForRating`.

## Test Plan

**`tests/seedToken.test.ts`** (new)

- Round-trips: `formatSeedToken('abc', 4)` → `'abc@4'` → parses back to `{ seed: 'abc', levelId: 4 }`.
- Bare seed formats and parses with no suffix and a null level.
- A seed containing `@` survives: `me@example.com` parses whole, level null.
- An invalid suffix is part of the seed: `puzzle@home`, `seed@9`, `seed@`, `seed@2.5`.
- Last-`@` split: `a@b@4` → seed `a@b`, level 4.

**`src/logic/puzzleGenerator.test.ts`**

- The existing 5×5 and 10×10 cases stay — the API still takes a size, and #17 restricts the UI, not
  the logic layer. Add a comment saying so, so a later reader does not "fix" them.
- New: the same seed at two levels produces different solutions (the check #20 ran by hand).
- New: seed plus level round-trips — parse a token, generate from it, and get a puzzle identical to
  one generated from the same seed and level directly.

**`tests/generation.test.ts`**

- A generated puzzle carries the `levelId` that was requested.
- When generation returns a nearest miss (`inBand: false`), `levelId` is still the requested level
  and not `levelForRating(rating).id` — the case the whole design turns on. Force it with a target
  the budget cannot reach, matching however the existing tests constrain the budget.

**`tests/PuzzleGenerator.test.tsx`** (new)

- No size control is rendered.
- Typing a bare seed and generating calls through at 15×15 and the default level.
- Pasting `abc@4` selects Evil, disables the selector, and generates for seed `abc` at level 4.
- Removing the suffix re-enables the selector.

**`tests/App.test.tsx`**

- A generated puzzle with `levelId` shows the token in the header.
- A generated puzzle without `levelId` (the resumed-from-an-older-session case) shows the bare seed
  and no stray `@`.

**e2e**

Six call sites do `getByLabel('15×15').check()` and must drop that line —
[cell-sizing.spec.ts:77](../../e2e/cell-sizing.spec.ts#L77),
[clue-visibility.spec.ts](../../e2e/clue-visibility.spec.ts) ×4, and
[large-puzzle-mobile.spec.ts:16](../../e2e/large-puzzle-mobile.spec.ts#L16). They all selected 15×15
explicitly, which is now the only size, so their puzzles are unchanged.

[mobile-interaction.spec.ts:97](../../e2e/mobile-interaction.spec.ts#L97) asserts
`text=Size` is visible to prove it is on the seed page; move that to the Difficulty radiogroup.

New in `e2e/app.spec.ts` or a small `e2e/seed-sharing.spec.ts`: generate from a seed, read the token
out of the header, go back, paste it, and confirm the same puzzle comes back. Worth keeping to
Medium — Evil generation is the slowest thing the app does, and `difficulty.spec.ts` is already
flaky under parallel load for that reason (noted in
[hide-difficulty-during-play.md](hide-difficulty-during-play.md)).

Full suite: `npm test` and the e2e run before this is called done.

## Open Questions

- **Should a pasted token disable the level selector, or rewrite the input instead?** The plan
  disables it. The alternative is to strip the suffix out of the field on blur and leave the selector
  live, which keeps one editable control but edits what the player typed. Default: disable.
- **Numeric level id or level name in the token?** Plan: numeric (`@4`), matching #20's proposal and
  the id already persisted in localStorage. A name (`@evil`) reads better if someone dictates a
  token aloud.
- **Should the seed page say anything about 15×15 beyond the helper text?** The Quick Play card says
  "Start a random 15×15 puzzle"; the seed page's subtitle is just "Generate a puzzle from a seed".
  Default: a mention in the helper text under the input, nothing more.
- **Deferred, not in this change:** per-size calibration and reachability (#17 option 2); URL-based
  sharing; routing seed-form generation through the worker rather than the 5-second main-thread call
  in `PuzzleGenerator.tsx`. That last one is pre-existing — the form already defaulted to 15×15 — but
  removing the smaller sizes removes the only fast escape hatch from it, so it is worth recording.
