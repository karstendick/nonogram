# Sharing a Puzzle, and Calibrating Every Size

> **Source:** [#17 — difficulty levels are only calibrated for 15×15](https://github.com/karstendick/nonogram/issues/17)
> and [#20 — sharing a seed no longer reproduces the same puzzle](https://github.com/karstendick/nonogram/issues/20).
> Branch: `seed-fixes`.
>
> Scope settled in conversation: the "Enter a Seed" page's text-to-puzzle generator was never a
> wanted feature — it was assumed to be the loader for shared puzzles. It is being removed, which
> resolves both issues more directly than either proposed.

## Context

The app has one word and one text box doing two unrelated jobs, and the conflation is the bug.

**Sharing.** The game header shows `Seed: f47ac10b-…` with a copy button, meant to be sent to someone
so they get your puzzle. It does not work (#20): the string names a _starting point for generation_,
not a puzzle. `generatePuzzle(size, seed, levelId)` takes all three, so the recipient's app re-runs
generation at _their_ size and difficulty and produces a different grid. Verified in the issue —
`generatePuzzle(15, 'shared-seed', 4)` and `generatePuzzle(15, 'shared-seed', 2)` have different
solutions.

**Generating from typed text.** The same page is headed **Generate Puzzle**, hints _"Enter any text
to use as a seed for generation"_, and offers size and difficulty controls. Type anything, get a
puzzle. This is the feature nobody asked for, and removing it is what makes the rest simple.

**Sizes were never calibrated (#17).** The level presets were measured at 15×15 only, but the seed
page offers 5×5 and 10×10 and passes the size straight through. When generation cannot hit the
requested band it returns its nearest miss, so a player asks for Evil at 5×5 and quietly gets
something else. Quick Play is unaffected today only because
[service.ts](../../src/logic/generation/service.ts) hardcodes `size: 15`.

Removing the typed-text generator makes Quick Play the only way to make a puzzle, so **Quick Play
takes back the size selector it lost in #16** — which is where the small grids belong anyway. They
are kept for onboarding, and a new player presses Play Random Puzzle; they do not open a seed form.

There is no URL handling anywhere in `src/`, and no `plan.md` — #20's reference to "Phase 10 notes in
`plan.md`" points at a file that is gone. URL sharing stays out of scope.

## Requirements

1. The string the game header copies — the **puzzle code** — reproduces that puzzle exactly, on its
   own. Pasting it into the load page opens that puzzle at its correct size and difficulty.
2. This works for every generated puzzle, including Quick Play's, which is where most shared puzzles
   come from.
3. A malformed or edited code is rejected with a message, never opened as a broken puzzle.
4. Quick Play offers 5×5, 10×10 and 15×15, at all four difficulty levels.
5. Each (size, level) pair generates from presets measured at that size.
6. When generation misses the requested band, the player is told what they got instead.
7. Typing arbitrary text to generate a puzzle is gone. The page that housed it becomes the place
   you paste a code.
8. A puzzle resumed from a session predating this change still works and still shows a code.
9. Sharing produces a link. Opening it goes straight to that puzzle, and the field that accepts a
   code accepts a pasted link too.

## Research

Measured with `scripts/size-presets.test.ts` (`npm run size-presets`), 1500 accepted samples per size
across the ten knob settings `calibrate.test.ts` sweeps, plus an end-to-end pass against the real
5000ms budget. Kept alongside `calibrate` and `levels-d` as the record of how the presets were chosen.

### Presets, per size — the values that go into `levels.ts`

| Level  | 5×5              | 10×10            | 15×15            |
| ------ | ---------------- | ---------------- | ---------------- |
| Easy   | fill 0.6 / sm 2  | fill 0.6 / sm 2  | fill 0.6 / sm 2  |
| Medium | fill 0.5 / sm 0  | fill 0.65 / sm 0 | fill 0.7 / sm 0  |
| Hard   | fill 0.35 / sm 1 | fill 0.5 / sm 0  | fill 0.45 / sm 1 |
| Evil   | fill 0.35 / sm 2 | fill 0.35 / sm 1 | fill 0.35 / sm 1 |

The 15×15 column reproduces the four shipped presets exactly, at hit rates within sampling noise of
the recorded ones. That agreement licenses trusting the other two columns, and means **15×15
generation does not change**.

### Every level is reachable at every size

12 trials per cell, 5000ms budget: **100% found, in all twelve cells.** Medians ran from under 1ms
(5×5 Easy) to 130ms (15×15 Evil); the worst single trial was 580ms. So Quick Play can offer every
combination, with no gating and no availability matrix.

Two findings worth keeping, because both mislead anyone reasoning from hit rates alone:

- **A low hit rate is not unavailability.** A 5×5 draw costs ~0.05ms against ~40ms at 15×15, so 5×5
  Hard — the worst cell at a 6% hit rate — still resolves in 31ms. What matters is hit rate divided
  by draw cost, and draw cost spans three orders of magnitude across the size range.
- **The ladder is not monotonic at 5×5.** Evil (46%) is far easier to reach there than Hard (6%) or
  Medium (11%). On a grid that small the middle techniques rarely end up being the _hardest_ step: a
  puzzle either falls to line-solving or needs a contradiction, with little in between.

Two caveats to record, neither of them blocking. At 5×5 the deduction counts barely separate the
levels (medians 15 / 16 / 17 / 17 against 80 / 89 / 99 / 107 at 15×15), so the second axis carries
almost no information on a small grid. And the 5×5 Medium and Hard presets rest on 39 and 21 hits, so
which setting "wins" those two cells is within noise of several others — it decides tens of
milliseconds of search, nothing a player could perceive.

### Encoding the puzzle costs less than encoding a recipe for it

A nonogram has no givens — the puzzle _is_ its clues, derived from the solution — so encoding one
means encoding the solution, a bit per cell. Packed and base64url-encoded:

| Size  | bits | code     | deflate |
| ----- | ---- | -------- | ------- |
| 5×5   | 25   | 6 chars  | 8       |
| 10×10 | 100  | 18 chars | 20      |
| 15×15 | 225  | 39 chars | 42.6    |

Against the string shared today: a 36-character UUID that does not identify the puzzle. Deflate loses
— at ~40% fill these grids are near-incompressible at this scale, so it costs a header and buys
nothing.

Decoding and re-rating, over six puzzles per cell:

|      | 5×5   | 10×10 | 15×15  |
| ---- | ----- | ----- | ------ |
| Easy | 0.5ms | 0.9ms | 2.6ms  |
| Evil | 0.6ms | 3.1ms | 11.8ms |

Worst case anywhere 13.2ms, against a 580ms worst-case regeneration.

## Design Decisions

### The shared string is the puzzle, not a recipe for it

The solution grid packed one bit per cell, base64url. The alternative was a `seed@size-level` token
regenerated on the recipient's device; the grid wins, and it is shorter than the UUID shipped today.

- **It opens in milliseconds** rather than up to 580, so it needs no worker and no progress UI.
- **It cannot drift.** A recipe token is a standing promise that generation stays deterministic
  forever; any later preset or algorithm change would silently repoint every string already shared,
  with no error and no way to notice. A grid is immune.
- **`Puzzle` gains no field.** A recipe would have had to carry the _requested_ level, because
  generation returns a nearest miss when it cannot hit the band — so the achieved rating is not
  enough to regenerate from. With the grid in hand there is nothing to re-derive.

### No marker character, because there is nothing to disambiguate

A code is the bare encoded grid, with no prefix. Size is implied by length, which is unique per size:
6, 18 and 39 characters. Any other length is rejected, and a new size would simply add a new valid
length.

One constraint to record, since it is invisible and would bite anyone who later reunited the two
kinds of string in one field: **48% of six-letter dictionary words decode to a uniquely solvable 5×5
nonogram** — `puzzle` among them. Six characters is both a plausible typed string and a complete 5×5
code, and validating the decode does not separate them, because at 25 bits a large share of arbitrary
grids happen to solve uniquely. A field that accepted both would need a marker character. This one
accepts only codes, so it does not.

### Decoding reuses `evaluatePattern`

An edited code decodes to an arbitrary grid that may be degenerate, ambiguous or unsolvable.
[`evaluatePattern`](../../src/logic/generation/evaluate.ts) already vets exactly this — uniform-clue
rejection, the sound ambiguity proof, then the depth-1 solve, in cost order — returning a rated
`Candidate` or null. Every generation strategy uses it, so a pasted grid is validated by the same
code that vets a generated one, and the rating falls out as a by-product. Null becomes "that is not a
valid puzzle code".

### The code is the loaded puzzle's `id`

A pasted puzzle needs an `id` for the store's persistence and the header. The code is unique to the
grid and stable across reloads. Generated puzzles keep their seed as `id` — the comment at
`strategies/index.ts:70` stays true — and their code is computed from the solution for display, which
is also what makes requirement 8 free: nothing needs to have been stored.

### The shared string is called a code

Settled in conversation. `Code:` in the game header, "puzzle code" wherever it is described, and the
word "seed" disappears from everything a player sees. It survives only inside the generator, where a
seed is still what drives the random draws — and that is now an implementation detail with no UI
surface, which is the point.

This renames the input label the six e2e files reach for as `getByLabel('Seed')`. Those files are
being rewritten anyway to paste a fixed code instead of generating, so the churn is already paid for.

### Entering a code is a disclosure on the landing page, not a page

The "Enter a Seed" card becomes **Enter a code**. Clicking it reveals an input and an Enter button
directly beneath it, in place; clicking again collapses it. There is no navigation and no separate
view.

A bare text box sitting on the landing page would invite input from players who have no code and no
reason to type anything — the field is for the minority who arrived with a string someone sent them.
Hiding it behind its own card keeps the landing page three clear choices, while removing the page
transition that the old flow spent on a form that is now one input and one button.

Consequences: the `enterSeed` view leaves `App.tsx`'s state machine, taking the app from four views
to three. The revealed panel needs `aria-expanded` on the card, focus moved into the input on reveal
so a paste can follow immediately, Enter in the field submitting as it does today, and the
invalid-code message rendering inside the panel rather than on a page of its own.

### Pre-made puzzles get codes too, and a code that names one restores it

A code encodes any grid, so the ten hand-drawn puzzles get one as well and become shareable — which
no recipe token could ever have managed, since they were never generated from a seed. The header's
code stops being gated on `isGeneratedPuzzle`.

The caveat that made this look unattractive was that a shared "Cat" would come back titled
"Generated 15×15". Fixed by a lookup rather than by encoding the title: build a `Map<code, PuzzleData>`
over the collection once, and have `puzzleFromCode` check it first. A code that matches a pre-made
returns that puzzle with its curated title, its real `id`, and its stored rating — which also skips
the solve, since `rate-premades` computed that rating offline already. Ten entries, built at module
load.

**The 7×7 "Heart" is dropped from the collection**, leaving every puzzle in the app at 5×5, 10×10 or
15×15. Not an encoding constraint — code length identifies size uniquely for everything from 5×5 up,
and 7×7 would have worked at 10 characters — but a stray size the generator can never produce is not
worth the inconsistency.

### A shared link carries the code in the URL hash

`https://karstendick.github.io/nonogram/#<code>`. Built from `location.origin`,
`import.meta.env.BASE_URL` and the code, so it is correct in production, in the `/nonogram/preview/`
deploys, and in local dev without knowing which it is in.

**The hash, not a path or a query.** A path (`/nonogram/p/<code>`) is out: `public/404.html` is a real
error page, not the SPA-routing shim that trick depends on, so such a link would land on it. A query
string would work, but the hash is the only form that never touches the network, the service worker
or Pages routing at all — and this app ships a PWA service worker whose scope has already caused
trouble with preview deploys, per the comments in `vite.config.ts`. The hash keeps sharing entirely
out of that.

**The hash is cleared once consumed**, with `history.replaceState`. Otherwise reloading the page
re-loads the shared puzzle from scratch and silently discards the solve in progress on it — the
player's own work, destroyed by a refresh. Clearing it means a reload resumes from the store like any
other puzzle.

**A link beats saved progress.** `App.tsx` currently opens straight into a persisted unfinished
puzzle; a code in the hash takes precedence, because following a link is an explicit request. This
costs no more than choosing any other puzzle does today — the store holds one puzzle, so every
selection already replaces what was there.

**The field accepts a link as readily as a code**, since people paste whole URLs. Anything after the
last `#` is taken as the code, so both forms work with no mode or instruction.

**The header shows the code but copies the link.** A full URL is too long to sit in the header, and
the code is what identifies the puzzle to someone reading a screenshot. The button says "Copy link"
so the difference is stated rather than discovered. An invalid or unknown code in a hash falls back
to the landing page with a message, rather than an empty screen.

### The generation buffer becomes keyed by size and level

`GenerationService` holds one ready puzzle and one in-flight job, both keyed by `levelId`, with
`size: 15` hardcoded in the worker request and the main-thread fallback. With Quick Play offering
sizes, the key becomes `(size, levelId)` throughout — `speculate`, `take`, `refill`, `hasReady` and
the ready comparison. The store's `lastLevelId`, which exists so speculation can guess what the
player will pick, gains a `lastSize` beside it for the same reason.

The buffer stays at one puzzle. A cell per size-and-level combination would be twelve background
generations for a player who will pick one.

### Quick Play reports a missed band

Requirement 6. `GeneratedPuzzle` already carries `inBand`, and
[LandingPage](../../src/components/LandingPage.tsx) discards it. With Quick Play the only generation
path, this is where #17's "asked for Evil, silently got something else" has to be answered: when
`inBand` is false, say which level it actually produced.

## Implementation Plan

**Presets**

1. **`src/logic/generation/levels.ts`** — `params` becomes `Partial<Record<number, PatternParams>>`,
   populated from the Research table.
2. **`src/logic/generation/strategies/index.ts`** — `presetFor(target)` reads `params[target.size]`,
   falling back to `params[15]` for sizes only the calibration scripts ask for. Its comment's
   percentages become the 15×15 column of a table.

**The code**

3. **`src/logic/puzzleCode.ts`** (new) — `encodePuzzleCode(solution)` and `decodePuzzleCode(input)`,
   the latter returning a grid or null on any length or alphabet problem.
4. **`src/logic/puzzleGenerator.ts`** — add `puzzleFromCode(code)`: decode, validate via
   `evaluatePattern`, return a `Puzzle` whose `id` is the code.
5. **`src/App.tsx`** — `SeedDisplay` becomes `PuzzleCodeDisplay`, rendering
   `encodePuzzleCode(puzzle.solution)` rather than `puzzle.id`, at both header call sites
   ([195](../../src/App.tsx#L195), [216](../../src/App.tsx#L216)).

**Quick Play gains sizes**

6. **`src/logic/generation/service.ts`** — key the buffer and jobs on `(size, levelId)`; replace both
   hardcoded `size: 15` targets; `speculateWhenIdle` takes both.
7. **`src/store/gameStore.ts`** — add `lastSize` beside `lastLevelId`, persisted for speculation.
8. **`src/components/LandingPage.tsx`** — a size selector beside the level selector; pass both to
   `take` and `speculate`; report `inBand: false` by naming the level actually produced.

**The load page replaces the generator**

9. **`src/components/PuzzleCodeEntry.tsx`** (new, replacing `PuzzleGenerator.tsx`) — the
   **Enter a code** card and the panel it reveals: one input, an Enter button, `puzzleFromCode`, and
   an invalid-code message. It owns its own expanded state, so `LandingPage` renders it beside the
   other cards and nothing else changes there.
10. **`src/App.tsx`** — drop the `enterSeed` view and its page markup; the view union becomes
    `'landing' | 'premade' | 'game'`.
11. **`src/logic/puzzleGenerator.ts`** — `generatePuzzle` keeps its signature; it is now used only by
    tests and the calibration scripts, and the doc comment should say so.

**Docs**

12. **`src/data/puzzles.json`** — remove the `heart` entry. Nine puzzles remain, all 5×5, 10×10 or
    15×15.
13. **`src/App.tsx`** — the code display is no longer gated on `isGeneratedPuzzle`; every puzzle
    shows one, labelled with the code and copying `shareUrl(code)`. On boot, read the hash before
    the saved-progress branch: a valid code opens that puzzle in the game view and clears the hash
    via `history.replaceState`; an invalid one lands on the landing page with a message.
14. **`src/logic/puzzleCode.ts`** — add `shareUrl(code)`, building from `location.origin` and
    `import.meta.env.BASE_URL`, and `codeFromInput(text)`, which takes everything after the last `#`
    so a pasted link and a bare code both work. `PuzzleCodeEntry` routes its input through it.
15. **`README.md`** line 43 — "every generated puzzle has a seed you can copy" becomes a code that
    reproduces the exact puzzle. The Quick Play description gains sizes.
16. **`docs/specs/puzzle-difficulty.md`** — its scope section calls 15×15 "the only size this feature
    is designed and calibrated for". Append a note pointing here; that document appends rather than
    rewrites.

Not touched: the worker, `LevelSelector`, `RatingBadge`, `PuzzleSelector`, the pre-made collection,
`levelForRating`, and the `Puzzle` type.

## Test Plan

**`tests/puzzleCode.test.ts`** (new)

- Round-trips at all three sizes; encoded lengths are exactly 6 / 18 / 39, guarding the format against
  a quiet packing or padding change.
- `decodePuzzleCode` returns null for a wrong length, non-base64url characters, and a truncated code.
- A 15×15 code carries 232 bits for 225 cells; assert the 7 spare bits are ignored, not read as cells.

**`tests/puzzleFromCode.test.ts`** (new)

- A code from a generated puzzle loads to the same solution, clues, width and height, and its
  recomputed rating matches what the generator measured.
- A structurally valid code for a degenerate grid is rejected — construct one directly, e.g.
  all-filled, which gives uniform clues.
- The loaded puzzle's `id` is its code.

**`tests/premadeCodes.test.ts`** (new) — every pre-made round-trips through its code, and a code
matching one returns its title, `id` and stored rating rather than a re-derived "Generated N×N". Also
asserts every pre-made is 5×5, 10×10 or 15×15, which is what keeps the collection conformant after
`heart` is removed.

**URL sharing** — in `tests/puzzleCode.test.ts`: `codeFromInput` returns the code from a full share
link, from a bare code, and null from a link whose hash is not a code; `shareUrl` respects a
non-root `BASE_URL`, which is what preview deploys run under. In `tests/App.test.tsx`: a valid hash
opens that puzzle and leaves the hash cleared, a hash beats persisted progress, and an invalid hash
lands on the landing page with a message rather than a blank screen.

**`tests/generation.test.ts`**

- Every level has a preset at 5, 10 and 15 — the completeness Quick Play relies on.
- `presetFor` at an unmeasured size falls back to 15×15 rather than throwing.
- Each of the twelve (size, level) pairs generates in band for a couple of fixed seeds. The slowest
  cell measured a 580ms worst case; keep the seed count small and be ready to mark it slow if CI
  disagrees.

**`tests/generationService.test.ts`** — the buffer is keyed by size as well as level: a puzzle made
ready at 15×15 Medium is not handed out for a 5×5 Medium request, and asking for one starts a fresh
job rather than returning the wrong size.

**`tests/LandingPage.test.tsx`** — the size selector renders and drives `take`; an out-of-band result
names the level actually produced.

**`tests/PuzzleCodeEntry.test.tsx`** (new) — the input is absent until the card is clicked, and the
card carries `aria-expanded`; revealing focuses the input; a valid code opens that puzzle; garbage
shows the invalid-code message and opens nothing; Enter in the field submits; clicking the card again
collapses it.

**`tests/App.test.tsx`** — the header's code decodes back to the puzzle's solution, which is stronger
than matching a string and catches a display/encode mismatch. A puzzle restored from persisted state
still shows a code.

**e2e** — six spec files build their test puzzle through the seed form
(`app`, `cell-sizing`, `clue-visibility`, `large-puzzle-mobile`, `mobile-interaction`,
`mobile-visual`). They move to pasting a fixed 15×15 code, which is an upgrade on both axes: the
puzzle becomes deterministic rather than whatever generation produced, and it opens in milliseconds
instead of waiting on a generation run. `difficulty.spec.ts` is flaky today for exactly that reason.
Their setup also loses a navigation: click **Enter a code**, fill the revealed input, Enter.

[x-centering.spec.ts:12](../../e2e/x-centering.spec.ts#L12) selects the pre-made by name —
`getByText('Heart')` — and must point at another puzzle once `heart` is removed. Five more specs
click the _first_ puzzle in the picker, which changes from the 7×7 Heart to the 5×5 House; they
assert only that cells exist and are sized sanely, so this should hold, but `cell-sizing.spec.ts`
measures bounding boxes and is worth re-running deliberately. The screenshots in `mobile-visual` are
saved artifacts rather than compared baselines, so nothing there breaks.
`tests/CompletionModal.test.tsx:54` builds a synthetic `makePuzzle('Heart', 7)` unrelated to the
collection; rename it to avoid implying a puzzle that no longer exists.

Two existing tests assert the old flow's structure and change meaning rather than just mechanics.
[app.spec.ts:47](../../e2e/app.spec.ts#L47) "should navigate to seed entry page" becomes a test that
the card reveals its input in place. [mobile-interaction.spec.ts:92](../../e2e/mobile-interaction.spec.ts#L92)
"should navigate between pages on mobile" loses one of the pages it navigates between — rewrite it
around the pre-made page, or drop it as covered by the disclosure test.

New `e2e/sharing.spec.ts`: play a Quick Play puzzle, copy its code, reload, paste, confirm the same
grid.

Full suite: `npm test` and the e2e run before this is called done.

## Implementation notes (as built)

Built as specified. Four things worth recording.

**A StrictMode bug the e2e suite caught and jsdom did not.** The first cut read the hash and cleared
it in the same `useState` initializer. StrictMode invokes an initializer twice and keeps the _second_
result, so the first call consumed the hash and its result was discarded — leaving the second call
looking at an empty hash. A valid link still worked, but only by accident: its discarded first pass
had already loaded the puzzle into the store as a side effect during render. An invalid link had no
such side effect, so it silently showed the landing page with no message. Both reads are pure now,
and clearing the hash is a `useEffect`. The unit tests passed throughout — only the browser run
exposed it.

**The e2e suite got faster.** 1.8 minutes to 54 seconds, because six spec files no longer type a seed
and wait for generation; they paste a fixed code from `e2e/fixtures.ts` and open in milliseconds.
That also makes their puzzles deterministic rather than whatever generation produced.

**Sizes came out of `levels.ts`.** `SIZES` and `DEFAULT_SIZE` live beside the levels, since the code
format's length-implies-size rule and the size selector both need the same list.

**The twelve-cell reachability test costs 450ms**, so it runs in the normal suite rather than being
marked slow.

Unrelated and left alone: `e2e/x-centering.spec.ts` writes `x-centering-test.png` to the repo root
rather than the gitignored `screenshots/`, so running the e2e suite dirties `git status`.
