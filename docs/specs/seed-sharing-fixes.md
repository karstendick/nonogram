# Seed Sharing: Sizes That Are Honest, and a Code That Reproduces the Puzzle

> **Source:** two issues, taken together because one decides the other —
> [#17 — Difficulty levels are only calibrated for 15×15, but seed entry offers 5×5 and 10×10](https://github.com/karstendick/nonogram/issues/17)
> and
> [#20 — Sharing a seed no longer reproduces the same puzzle (level is not part of the shared token)](https://github.com/karstendick/nonogram/issues/20).
> Branch: `seed-fixes`.
>
> #17 resolves as **option 2, calibration only**. Sizes stay. The measurement in
> [Research](#research) shows every difficulty level is reachable at every size once the presets are
> calibrated per size, so the reachability gating that option 2 anticipated is not needed and is not
> being built. See [the design decision](#17-resolves-as-calibrate-per-size-and-gate-nothing) for the
> two positions this went through before the data settled it.
>
> #20 resolves by **shipping the puzzle rather than a recipe for it**: the copied string encodes the
> solution grid, not `(seed, size, level)`. That is option C in
> [Token Encoding](#token-encoding-the-options), chosen because sharing is a copy/paste action — no
> one dictates a seed aloud — which removes the only argument against it. It fixes #20 more
> completely than the fix #20 proposed, and it is immune to the generator drift that would silently
> break a recipe token later.

## Context

A generated puzzle is determined by three inputs: `generatePuzzle(size, seed, levelId)` in
[puzzleGenerator.ts](../../src/logic/puzzleGenerator.ts). The level picks the pattern-generator
presets from [levels.ts](../../src/logic/generation/levels.ts), so the same seed at a different level
is a different grid. The sharing UI never caught up with that, which leaves two defects that meet in
the same file.

**Size is offered but was never calibrated (#17).** The knob presets behind each level — fill ratio
and smoothing rounds — were measured at 15×15 only, as
[puzzle-difficulty.md](puzzle-difficulty.md) states in its scope section. Quick Play is unaffected:
[service.ts](../../src/logic/generation/service.ts) hardcodes `size: 15` in both the worker request
and the no-worker fallback. But [PuzzleGenerator.tsx](../../src/components/PuzzleGenerator.tsx)
offers 5×5 / 10×10 / 15×15 and passes the choice straight through to a target calibrated for a
different one. When generation cannot hit the band it returns its nearest miss and reports that
puzzle's real rating — honest in what it displays, but the player asked for Evil and quietly got
something else.

The history explains the asymmetry: Quick Play had 5/10/15 radios too, until PR #16 replaced them
with the level selector and fixed the size at 15. The seed form kept its radios because nobody went
back for it.

**The shared token carries only the seed (#20).** `finish()` in
[strategies/index.ts:72](../../src/logic/generation/strategies/index.ts#L72) sets `puzzle.id = seed`
— deliberately the seed that was asked for, not whichever candidate seed won, so that sharing works.
`SeedDisplay` in [App.tsx:16](../../src/App.tsx#L16) then shows and copies that id, and the entry
form defaults to Medium at 15×15. So copying an Evil puzzle's seed and sending it hands the
recipient a Medium puzzle, silently. The issue verified it: `generatePuzzle(15, 'shared-seed', 4)`
and `generatePuzzle(15, 'shared-seed', 2)` have different solutions.

The two issues meet in `PuzzleGenerator.tsx`, and #17's answer decides #20's token format: because
size stays, the token is three-part rather than two.

Two notes on ground truth, since both issues gesture at things that do not exist:

- There is no URL handling anywhere in `src/`, and no `plan.md` in the repo — #20's reference to
  "the Phase 10 notes in `plan.md`" points at a file that is gone. URL sharing stays out of scope
  and is not designed here; the token is a string on the clipboard.
- No compound token has ever shipped, so there is no legacy token format to stay compatible with.
  The only thing in the wild is a bare seed.

## Requirements

1. The seed form keeps 5×5, 10×10 and 15×15, and every size offers all four difficulty levels.
2. Each (size, level) pair generates from presets measured at that size, not borrowed from 15×15.
3. When generation misses the band for a particular seed, the player is told what they got instead.
   Generation is a search against a time budget, and the UI should not claim more certainty than that.
4. The string the game header copies — the **puzzle code** — reproduces the puzzle exactly, on its
   own, with nothing else needed.
5. Pasting a puzzle code into the seed form loads that puzzle, with its correct size and difficulty.
6. This holds for Quick Play puzzles as well as ones generated from the form; Quick Play is where
   most shared puzzles come from.
7. Typing free text into the seed form still generates a puzzle from it, at the chosen size and
   level, exactly as it does today. A puzzle code and a seed are told apart without the player having
   to say which they pasted.
8. A malformed or hand-edited code is rejected with a message, never loaded as a broken puzzle.
9. A puzzle resumed from a session that predates this change still works, and still shows a code.

## Research

Measured with `scripts/size-presets.test.ts` (new — see the design decision below for why it is not
`levels-d`). 1500 accepted samples per size, 150 per knob setting across the ten settings
`calibrate.test.ts` sweeps, then a separate end-to-end pass of 12 trials per cell against the real
5000ms budget.

### Best knob setting per rung, and its hit rate

| Level  | 5×5                    | 10×10                  | 15×15                  |
| ------ | ---------------------- | ---------------------- | ---------------------- |
| Easy   | fill 0.6 / sm 2 — 100% | fill 0.6 / sm 2 — 95%  | fill 0.6 / sm 2 — 49%  |
| Medium | fill 0.5 / sm 0 — 11%  | fill 0.65 / sm 0 — 41% | fill 0.7 / sm 0 — 85%  |
| Hard   | fill 0.35 / sm 1 — 6%  | fill 0.5 / sm 0 — 67%  | fill 0.45 / sm 1 — 86% |
| Evil   | fill 0.35 / sm 2 — 46% | fill 0.35 / sm 1 — 26% | fill 0.35 / sm 1 — 51% |

The 15×15 row **reproduces the shipped presets**: all four settings match the ones recorded in the
`presetFor` comment in `strategies/index.ts`, with rates (49/85/86/51%) within sampling noise of the
recorded 57/90/88/40%. That agreement is what licenses trusting the 5×5 and 10×10 rows.

### Whether that hit rate is enough — 12 trials per cell, 5000ms budget

| Level  | 5×5                  | 10×10           | 15×15            |
| ------ | -------------------- | --------------- | ---------------- |
| Easy   | 100% · 0ms · 6 draws | 100% · 1ms · 4  | 100% · 4ms · 5   |
| Medium | 100% · 1ms · 14      | 100% · 2ms · 3  | 100% · 3ms · 1   |
| Hard   | 100% · 31ms · 504    | 100% · 5ms · 3  | 100% · 15ms · 2  |
| Evil   | 100% · 2ms · 76      | 100% · 8ms · 26 | 100% · 130ms · 7 |

Medians; worst single trial across all twelve cells was 580ms (15×15 Evil), against a 5000ms budget.
**Every combination was found every time.**

### Three things the data says that the plan had wrong

**1. Nothing is unreachable.** The prediction — from the old pass-count table at
[puzzle-difficulty.md:52](puzzle-difficulty.md#L52), where 148 of 150 5×5 puzzles landed in the
easiest tier — was that the hard end would not exist at 5×5. It does. That table measured the
_unbiased_ distribution; biasing the knobs toward a rung is exactly what the level presets do, and it
moves 5×5 contradiction puzzles from 1-in-75 to nearly one in two.

**2. A low hit rate is not the same as unavailable, and the difference is size.** A 5×5 draw costs
about 0.05ms against roughly 40ms for a 15×15 one, so 5×5 Hard at a 6% hit rate — the worst cell in
the table, and the one the abandoned 10% threshold would have disqualified — is found in 31ms. The
threshold was measuring the wrong quantity: what matters is expected time to a hit, which is hit rate
divided by draw cost, and draw cost varies by three orders of magnitude across the range.

**3. The ladder is not monotonic at 5×5.** Evil (46%) is far easier to reach there than Hard (6%) or
Medium (11%). On a grid that small the middle techniques rarely end up being the _hardest_ thing a
solve required: either the line solver walks it home by completion alone, or it needs a contradiction,
with little room in between. So availability was never going to be "a prefix of the ladder", which is
what the earlier test plan asserted as an invariant. It has been removed.

One honest caveat to record: at 5×5 the deduction counts barely separate the levels (medians 15 /
16 / 17 / 17 from Easy to Evil, against 80 / 89 / 99 / 107 at 15×15). The second axis carries almost
no information on a small grid. Nothing here depends on it, but a player comparing two 5×5s by
deduction count is reading noise.

## Token Encoding: The Options

A token can be a **recipe** — `(seed, size, level)`, regenerated on the recipient's device — or the
**puzzle itself**. This section is the comparison that settled it. **Chosen: option C, encode the
grid.**

### What a puzzle actually costs to write down

A nonogram has no givens — the grid starts empty, and the puzzle _is_ the clues, which are derived
from the solution. So encoding a puzzle directly means encoding its solution: one bit per cell.
Measured, packed and base64url-encoded, over eight generated puzzles per size:

| Size  | cells / bits | base64url    | deflate + base64url |
| ----- | ------------ | ------------ | ------------------- |
| 5×5   | 25           | **6 chars**  | 8 chars             |
| 10×10 | 100          | **18 chars** | 20 chars            |
| 15×15 | 225          | **39 chars** | 42.6 chars          |

Deflate makes it _bigger_. At ~40% fill these grids are close to incompressible at this scale, so
compression buys nothing and costs a header.

The number to compare against: a Quick Play token today is a 36-character UUID from `randomSeed()`,
which with a `@15-4` suffix is **41 characters**. Encoding the whole grid is shorter than encoding
the instructions for building it.

### The options

**A. Recipe token, UUID seeds** — `f47ac10b-58cc-4372-a567-0e02b2c3d479@15-4`, 41 chars.

What the implementation plan below currently describes. Smallest change: seeds already exist and
already round-trip; only the suffix is new.

**B. Recipe token, short seeds** — `a7k2m9x@15-4`, 12 chars.

Same as A, plus `randomSeed()` stops emitting a UUID. Seven base32 characters is 35 bits — 34 billion
distinct puzzles per level, and a collision is harmless anyway, since two players landing on the same
puzzle is not a defect. The UUID is doing a job nobody asked for: it exists to be globally unique
across machines and time, where all this needs is "unlikely to repeat".

Costs one small change to `service.ts` and nothing else. User-typed seeds are untouched — `puzzle-123`
still works and is still what the form's placeholder suggests.

**C. Encode the grid** — `kJ2mQ...` 39 chars at 15×15, 6 at 5×5.

Ship the puzzle, not the recipe. Three things get better:

- **Instant.** No regeneration. The slowest measured generation was 580ms and the budget allows
  5000ms, all of it currently on the main thread in `PuzzleGenerator.tsx`. Decoding is a memcpy, and
  re-deriving the rating is a single solve. Measured directly, over six puzzles per cell:

  |      | 5×5   | 10×10 | 15×15      |
  | ---- | ----- | ----- | ---------- |
  | Easy | 0.5ms | 0.9ms | 2.6ms      |
  | Evil | 0.6ms | 3.1ms | **11.8ms** |

  Worst single case anywhere was 13.2ms. That is 44× faster than the worst regeneration and 380×
  inside the budget — fast enough that the load is not perceptible and needs no worker.

- **Immune to generator drift.** A recipe token is a promise that generation stays deterministic
  forever. Any future change to presets, the pattern generator, or the strategy silently repoints
  every token ever shared. A grid cannot drift. (This change happens not to break anything: the
  measured 15×15 presets came back identical to the shipped ones, and 5×5/10×10 were never
  shareable-with-level in the first place. Next time there is no such guarantee.)
- **The requested-vs-achieved problem disappears.** There is no requested level to preserve, because
  there is no regeneration. `levelForRating` on the decoded grid is simply correct, and
  `Puzzle.levelId` is not needed at all.

It also makes _any_ puzzle shareable, including the hand-drawn pre-mades, which no recipe token can
express.

Three things get worse:

- **It is not a seed.** You cannot type it, say it aloud, or choose it. "Try seed `dragon` on Evil"
  stops being a thing a person can do, and the form's `e.g., puzzle-123` placeholder stops making
  sense. The feature is called Enter a Seed.
- **It needs a prefix to be told apart from a seed.** Six base64url characters is exactly the length
  of a packed 5×5 grid, so `dragon` would decode as a valid 5×5. Grid tokens need a marker character.
- **It needs validating.** A hand-edited blob decodes to an arbitrary grid that may be ambiguous or
  unsolvable, so the load path must solve and reject, with an error state the form does not have
  today.

**D. Both, accepted by the same field.** Seeds stay for the human, chosen, memorable case; a grid
token covers "share exactly this". The form detects which it was handed. The cost is two formats to
document, test and explain, and a decision about which one the copy button emits — whichever it is,
the other becomes a thing only power users find.

**E. Recipe token with a generation version** — `a7k2m9x@15-4v1`.

Answers the drift objection without giving up seeds: pin the generation rules a token was made under,
and keep old preset tables around so an old token still resolves. Costs a growing museum of
superseded generation parameters, forever, for a feature the issue itself rates low priority.

### Side by side

|                              | A. UUID recipe | B. Short recipe | C. Grid     | D. Both | E. Versioned recipe |
| ---------------------------- | -------------- | --------------- | ----------- | ------- | ------------------- |
| 15×15 token                  | 41 chars       | **12 chars**    | 39 chars    | either  | 14 chars            |
| 5×5 token                    | 41 chars       | **12 chars**    | **6 chars** | either  | 14 chars            |
| Typeable / memorable         | partly         | **yes**         | no          | **yes** | **yes**             |
| Load cost                    | up to 580ms    | up to 580ms     | **~8ms**    | varies  | up to 580ms         |
| Survives generator changes   | no             | no              | **yes**     | partly  | **yes**             |
| Can share a pre-made         | no             | no              | **yes**     | **yes** | no                  |
| Needs `Puzzle.levelId`       | yes            | yes             | **no**      | yes     | yes                 |
| Work beyond the current plan | **none**       | ~10 lines       | moderate    | most    | moderate            |

### Decision: C, with free-text seeds kept alongside

The case against C was that a 39-character blob is not a seed: you cannot type it, choose it, or say
it aloud. That objection does not survive contact with how the feature is actually used — **sharing
is a copy/paste action**. Nobody dictates a UUID over the phone either, so the recipe token was not
buying the memorability it was being credited for.

With that gone, C wins on every remaining axis. It is shorter than what ships today, it loads in
milliseconds instead of up to 580, it makes any puzzle shareable including the hand-drawn pre-mades,
and it is the only option that cannot be silently broken by a future change to the generator.

It also **dissolves the problem #20 was filed about** rather than working around it. There is no
requested-versus-achieved level to preserve, because there is nothing to re-derive: the grid travels,
and `levelForRating` on the decoded puzzle is simply correct. `Puzzle.levelId`, and all the
plumbing to thread a requested level through generation, is no longer needed at all.

**Free-text seed entry stays.** The seed form does two separable jobs, and C only replaces one of
them: reproducing a specific shared puzzle. Typing `puzzle-123` to get a deterministic puzzle out of
arbitrary text is a different feature, it works today, and removing it is not something either issue
asks for. So the field accepts both, distinguished by the marker character described below, and the
copy button emits a code. That is option D in shape, with a clear division of labour: **a seed is
something you choose, a code is something you were given.**

This makes the change larger than option A or B — encode, decode, validate, and an error path the
form does not have today — and the parts of the plan that existed to carry a level through
generation get deleted rather than written.

## Design Decisions

### #17 resolves as calibrate-per-size, and gate nothing

Small grids stay because they are the on-ramp. A 5×5 is where someone learns what a clue means and
what an X is for, and the app should be able to hand a new player one. That reason sits outside
anything the calibration data speaks to.

This spec went through two earlier positions, both recorded here because the reasoning is the useful
part:

- **Option 1, restrict seed entry to 15×15.** Chosen first for being the smallest change that
  removed the silent substitution. Dropped: it would have removed generated small grids from the app
  entirely. The pre-made collection spans 5×5 to 15×15, so small puzzles would still have existed —
  but as fifteen fixed pictures, which is a demo, not an on-ramp.
- **Option 2 with reachability gating.** Keep the sizes, measure which levels each size can reach,
  and disable the rest. Dropped on the measurement: there is nothing to gate. Every level is
  reachable at every size, every trial, well inside the budget.

What is left is the part that was always the real defect: **the presets are wrong for small grids,
so calibrate them.** The silent substitution in #17 is fixed by generating from the right presets,
not by restricting what can be asked for.

This is a considerably smaller change than the gated version — no availability matrix, no
`levelsAvailableAt`, no changes to `LevelSelector`, no cross-control gating between size and
difficulty, and no fallback behaviour when a selection becomes invalid. All of that machinery existed
to describe a hole in the matrix, and the matrix has no hole.

### Presets become per-size

`DifficultyLevel.params` becomes keyed by size:

```ts
params: Partial<Record<number, PatternParams>>; // 5 | 10 | 15 -> preset
```

`presetFor(target)` in `strategies/index.ts` looks up `params[target.size]`, falling back to the
15×15 preset for any size not in the table. The fallback matters because `generateForTarget` is
reachable from the calibration scripts at arbitrary sizes; the UI only ever asks for a measured one.

Easy uses `fill 0.6 / sm 2` at all three sizes, so one row of the table is the same value three
times. Worth writing out explicitly anyway rather than special-casing it — the three sizes were
measured independently and their agreement is a finding, not a shared constant to be factored out.

The 5×5 Medium and Hard presets rest on thin samples (39 and 21 hits respectively), so which setting
is "best" for those two cells is weakly determined. It matters less than it looks: several settings
are within noise of each other there, and end-to-end both cells are found in tens of milliseconds.
Flagged rather than resolved with more sampling, because the cost of being slightly wrong is
milliseconds.

### The measurement lives in its own script

`scripts/size-presets.test.ts` rather than a parameterized `levels-d.test.ts`, which was the earlier
plan. `levels-d` phase 1 is the right measurement, but phases 2 and 3 of that script exist to
evaluate option D — a length band within each rung — which was measured and rejected. Running them
at three sizes would spend minutes producing data for an abandoned design. The new script does phase
1 per size, adds the end-to-end budget check that actually decides availability, and leaves
`levels-d` untouched as the record of how the 15×15 presets were chosen.

Added to `package.json` as `npm run size-presets`, alongside the other measurement scripts, with
`SIZES`, `PER_SETTING`, `TRIALS` and `BUDGET_MS` overridable.

### The puzzle code is `~` plus the packed solution

`~` followed by the solution grid packed one bit per cell, base64url. 6 characters at 5×5, 18 at
10×10, 39 at 15×15.

**The `~` marker is load-bearing, not decoration.** Six base64url characters is exactly the length of
a packed 5×5 grid, so without a marker the seed `dragon` would decode as a perfectly valid 5×5
puzzle. `~` is outside the base64url alphabet (`A-Za-z0-9-_`) and is not something anyone types into
a seed field, so it separates the two formats with no ambiguity and no guessing.

Size is implied by payload length, which is unique per size: 4 bytes → 6 chars, 13 → 18, 29 → 39.
A length matching none of them is rejected. If a fourth size or a non-square grid is ever added, that
needs a version marker; `~` leaves room to introduce one without breaking existing codes.

### The recipe token, recorded and superseded

Earlier revisions of this spec specified `seed@<size>-<level>` — `shared-seed@15-4` — parsed by
splitting on the last `@` and accepting the suffix only if both parts were valid. It is recorded
here because two of its details are worth keeping if a recipe format ever comes back: the last-`@`
split is what let a seed containing `@` (`me@example.com`) keep working, and always emitting all
three parts avoided a suffix that was sometimes two fields and sometimes three.

It was superseded by the grid encoding for the reasons in
[Token Encoding](#token-encoding-the-options). Nothing depends on it; no compound token ever shipped,
so there is no format in the wild to stay compatible with.

### The requested-versus-achieved problem is gone, not solved

Worth recording because it drove three earlier revisions of this spec and its disappearance is the
strongest single argument for the decision.

Generation returns its nearest miss when the budget runs out without landing in the band
(`inBand: false`). So a recipe token could not use `levelForRating(puzzle.rating)` to fill in its
level: that is the level the puzzle _achieved_, and regenerating from it would use different presets
and produce a different grid. The requested level had to be threaded from the generator through
`Puzzle` and into the token, and got there via a new `levelId` field.

Encoding the grid removes the question. There is no regeneration, so there is no requested level to
preserve, and the rating computed from the decoded grid is the true one. **`Puzzle.levelId` is not
added.**

### Decoding reuses `evaluatePattern`, so validation is already written

Requirement 8. A hand-edited code decodes to an arbitrary grid that may be degenerate, ambiguous, or
unsolvable, so the load path has to check before handing it to the player.

That check exists: [`evaluatePattern`](../../src/logic/generation/evaluate.ts) takes a pattern and
returns a rated `Candidate` or null, running the uniform-clue rejection, the sound ambiguity proof
and the depth-1 solve in cost order. It is what every generation strategy already uses, so a decoded
grid is validated by exactly the same code that vets a generated one — and it returns the rating as a
by-product, which is the other thing decoding needs.

A null result becomes "that code is not a valid puzzle" in the form.

### The code is the decoded puzzle's `id`

A decoded puzzle needs an `id` for the store's persistence and for the header to display. The code
itself is the natural choice: it is unique to the grid, stable across reloads, and means
`SeedDisplay` shows `puzzle.id` for shared puzzles exactly as it does today.

Generated puzzles keep the seed as their `id` — the comment at `strategies/index.ts:70` explaining
why stays true — and their code is computed from the solution for display. So `id` keeps meaning
"how this puzzle got here", and the code is always derived from the grid.

### The header shows the code, and shows the same string it copies

No hidden divergence between the visible text and the clipboard. The header currently displays a
36-character UUID for a Quick Play puzzle, so a 39-character code is not a change in kind — and at
5×5 and 10×10 it is considerably shorter.

The label changes from `Seed:` to `Code:`, because it is no longer a seed. The `title` becomes
"Click to copy this puzzle's code".

### A missed band is reported, not swallowed

Requirement 3, and it applies only to the free-text seed path — a pasted code is never regenerated,
so it cannot miss. `generateForTarget` already returns `inBand`, and `generatePuzzle` currently drops
it on the floor. Add `generateForSeed(size, seed, levelId)` returning `{ puzzle, rating, inBand }`,
keep `generatePuzzle` as the thin puzzle-only wrapper so tests and scripts are untouched, and have
`PuzzleGenerator` use the richer one. When `inBand` is false the form says which level it actually
landed on, in the same place it currently reports failure.

With calibrated presets this should be close to unreachable in practice. It stays because it is a few
lines, and because the alternative is the app quietly lying in the one case it cannot rule out.

### Quick Play is not touched

#17 and #20 are both about the seed flow, and this change stays inside it. Whether the onboarding
argument also applies to Quick Play — where a new player is far more likely to be than the seed form
— is raised in Open Questions rather than answered here. The per-size presets this change measures
are exactly what such a follow-up needs, and the measurement now says a 5×5 Quick Play at any level
would work.

## Implementation Plan

**Presets** — unchanged by the encoding decision.

1. **`scripts/size-presets.test.ts`** and its `package.json` entry — already written for the
   measurement above; keep them as the record of how the presets were chosen, matching how
   `levels-d` and `calibrate` are kept.
2. **`src/logic/generation/levels.ts`** — `params` becomes `Partial<Record<number, PatternParams>>`,
   populated from the Research table. Update the comment above `LEVELS` to say the presets are
   measured per size and to point here.
3. **`src/logic/generation/strategies/index.ts`** — `presetFor(target)` reads `params[target.size]`,
   falling back to `params[15]`. Update its comment: the percentages it quotes become the 15×15 row
   of a three-row table. **No `levelId` threading** — see the design decision.

**The puzzle code**

4. **`src/logic/puzzleCode.ts`** (new) — the format in one place:
   - `encodePuzzleCode(solution: boolean[][]): string` — pack one bit per cell, base64url, prefix `~`.
   - `decodePuzzleCode(input: string): boolean[][] | null` — null for anything without the `~`
     marker, with a payload length matching no supported size, or not valid base64url. Shape only;
     it does not judge whether the grid is a good puzzle.
   - `isPuzzleCode(input: string): boolean` — the cheap `~` test the form uses to route input.
5. **`src/logic/puzzleGenerator.ts`** — add `puzzleFromCode(code: string): Puzzle | null`, which
   decodes, runs `evaluatePattern` for validation and the rating, and returns a `Puzzle` whose `id`
   is the code. Also add `generateForSeed(size, seed, levelId)` returning `{ puzzle, rating, inBand }`
   for the seed path; keep `generatePuzzle` as the puzzle-only wrapper so tests and scripts are
   untouched.
6. **`src/App.tsx`** — `SeedDisplay` becomes `PuzzleCodeDisplay`: it renders
   `encodePuzzleCode(puzzle.solution)` rather than `puzzle.id`, relabelled `Code:`, at both header
   call sites ([App.tsx:195](../../src/App.tsx#L195), [App.tsx:216](../../src/App.tsx#L216)).
   Deriving from the solution rather than the id means it works for any puzzle, including one
   resumed from an older session (requirement 9) — nothing needs to have been stored.

**The form**

7. **`src/components/PuzzleGenerator.tsx`** —
   - Route on input: a `~`-prefixed string is a code, anything else is a seed. When it is a code, the
     size and level controls are disabled with a line saying the puzzle is fully specified by the
     code; the button reads "Load Puzzle" rather than "Generate Puzzle".
   - A code that fails to decode or fails `evaluatePattern` shows "That puzzle code is not valid" —
     the error state requirement 8 needs, distinct from the existing generation-failed message.
   - The seed path is otherwise unchanged, and now reports `inBand: false` by naming the level it
     actually landed on.
   - Keep the input's label as `Seed` — eight e2e call sites use `getByLabel('Seed')`. Update the
     surrounding copy to say the field takes a seed or a pasted puzzle code, and the placeholder to
     show both shapes.

**Docs**

8. **`README.md`** — the "Shareable puzzles" bullet (line 43) says "every generated puzzle has a seed
   you can copy". Make it describe a code that reproduces the exact puzzle.
9. **`docs/specs/puzzle-difficulty.md`** — its scope section says 15×15 is "the only size this
   feature is designed and calibrated for". Append a note pointing here: all three sizes are now
   calibrated, and every level is reachable at each. Per that document's convention, append rather
   than rewrite.

Not touched: `service.ts`, the worker, `LevelSelector`, `RatingBadge`, `PuzzleSelector`, the pre-made
collection, `levelForRating`, and `Puzzle` — which gains no new field.

## Test Plan

**`tests/puzzleCode.test.ts`** (new)

- Round-trips at all three sizes: encode a known solution, decode it, get the same grid back.
- Encoded lengths are 6 / 18 / 39 characters plus the marker, matching the Research table — a guard
  against a padding or packing change quietly altering the format.
- `isPuzzleCode` is false for `dragon`, `puzzle-123`, `me@example.com`, and the empty string. The
  `dragon` case is the one that matters: six base64url characters is a valid 5×5 payload, and only
  the marker keeps it a seed.
- `decodePuzzleCode` returns null for a `~` with a bad length, non-base64url characters, and a
  truncated payload.
- Every decoded grid is exactly `size × size`, including the padding bits at the end of a 15×15
  payload, which carries 232 bits for 225 cells. Assert the 7 spare bits are ignored rather than
  read as cells.

**`tests/puzzleFromCode.test.ts`** (new, or in `puzzleGenerator.test.ts`)

- A code from a generated puzzle loads to a puzzle with the same solution, clues, width and height.
- Its rating matches the rating the generator measured — the recomputation agrees with the original.
- A structurally valid code for an ambiguous or degenerate grid is rejected. Construct one directly
  (an all-filled grid gives uniform clues) rather than hunting for one.
- The loaded puzzle's `id` is the code it came from.

**`src/logic/puzzleGenerator.test.ts`**

- Existing 5×5, 10×10 and 15×15 cases stay and now exercise real per-size presets.
- The same seed at two levels produces different solutions (the check #20 ran by hand).
- The same seed and level at two sizes produces different puzzles.

**`tests/generation.test.ts`**

- Every level has a preset at each of 5, 10 and 15 — the table is complete, which is the property the
  UI relies on by offering every combination.
- `presetFor` at an unmeasured size (say 12) falls back to the 15×15 preset rather than throwing.
- Each of the twelve (size, level) pairs generates in band for a couple of fixed seeds. The
  measurement says the slowest cell is a 580ms worst case, so this is affordable; keep the seed count
  small and the budget explicit, and be ready to mark it slow if CI disagrees.

**`tests/PuzzleGenerator.test.tsx`** (new)

- Pasting a valid code disables the size and level controls and loads that puzzle.
- Pasting `~garbage` shows the invalid-code message and loads nothing.
- Typing a free-text seed still generates at the selected size and level, with the controls live.
- An out-of-band seed result names the level actually produced.

**`tests/App.test.tsx`**

- The header shows a code for a generated puzzle, and it decodes back to that puzzle's solution —
  a stronger assertion than matching a string, and it catches a display/encode mismatch.
- A puzzle restored from persisted state with no new fields still shows a code (requirement 9).

**e2e**

The six `getByLabel('15×15').check()` call sites keep working unchanged — the size selector stays,
with every level still enabled at every size.
[mobile-interaction.spec.ts:97](../../e2e/mobile-interaction.spec.ts#L97)'s `text=Size` assertion
also still holds.

New in `e2e/seed-sharing.spec.ts`: generate from a seed, copy the code out of the header, go back,
paste it, and confirm the same grid returns. Worth doing at 5×5, where generation is instant and the
code is six characters — the e2e suite is already slow, and this test does not need a big grid to
prove the round trip. `difficulty.spec.ts` is already flaky under parallel load because Evil
generation is the slowest thing the app does (noted in
[hide-difficulty-during-play.md](hide-difficulty-during-play.md)); this adds nothing to that.

Full suite: `npm test` and the e2e run before this is called done.

## Open Questions

- **Which token encoding?** _Resolved: **C, encode the grid**, with free-text seed entry kept
  alongside it. Sharing is copy/paste, so the "you cannot type it" objection does not apply; and C is
  shorter than today's token, loads in milliseconds, cannot be broken by a future generator change,
  and removes the requested-versus-achieved problem entirely. See
  [Token Encoding](#token-encoding-the-options)._
- **Should pre-made puzzles get a code too?** They can now — a code encodes any grid, which is
  something no recipe token could do. Not built: `SeedDisplay` renders only for generated puzzles
  today, and extending it changes the pre-made screens, which is beyond what either issue asks. Cheap
  to add later. Note the title is lost in the round trip: a shared "Cat" comes back as
  "Generated 15×15".
- **Should Quick Play offer sizes again?** The reason for keeping small grids is onboarding, and a
  new player is far likelier to press Play Random Puzzle than to open the seed form. Sizes were
  removed from Quick Play in #16 and this change deliberately leaves it alone, since #17 and #20 are
  both about the seed flow. The measurement removes the obstacle: a 5×5 at any level generates in
  milliseconds. Recommended as a follow-up. Default for now: leave Quick Play at 15×15.
- **Should `randomSeed()` stop emitting UUIDs?** Option B's idea, now mostly moot — the UUID is no
  longer what gets shared, so its length stops mattering to anyone. It is still 36 characters of
  entropy where about 35 bits would do. Left alone; it is cosmetic once the code is the share format.
- **Is 10% the right availability threshold?** _Resolved: the question was wrong. Expected time to a
  hit is what matters, not hit rate, because draw cost spans three orders of magnitude across the
  size range — 5×5 Hard at a 6% rate resolves in 31ms. Every cell is reachable, so no threshold is
  needed and no gating is built. See [Research](#research)._
- **Are the 5×5 Medium and Hard presets well determined?** The measurement gave them 39 and 21 hits,
  so the winning setting is within noise of several others. Left as measured; the downside of a
  suboptimal choice there is tens of milliseconds.
- **Should a pasted code be distinguishable in the field, or rewritten?** The plan disables the size
  and level controls while a code is in the field, so the controls cannot contradict what the button
  will do. Not revisited since the encoding changed, and the answer may be simpler now: a `~` prefix
  is visually obvious in a way a `@15-4` suffix was not.
- **Deferred, not in this change:** URL-based sharing — now a much smaller job, since a code is
  already a URL-safe string and needs no regeneration on load; and routing seed-path generation
  through the worker rather than the 5-second main-thread call in `PuzzleGenerator.tsx`. Pasted codes
  never touch that path.
