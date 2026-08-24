# Puzzle Difficulty

> **Source:** no ticket — written from an idea raised in conversation.
>
> **Status: exploratory.** This spec is deliberately wide. It records the candidate models
> considered and the measurements taken against this codebase, not a finished design. Only a few
> things are settled (see [Design Decisions](#design-decisions-settled-so-far)); everything else
> lives in [Open Questions](#open-questions). Nothing here should be implemented yet.

## Context

**Scope: generated 15×15 puzzles.** That is what actually gets played — 15×15 is the largest grid
that fits comfortably on an iPhone screen — so it is the only size this feature is designed and
calibrated for. Smaller sizes still work and still get rated; they are simply not what the tiers are
tuned against, and nothing here should be traded off to serve them. The 5×5 and 10×10 numbers in
[Research](#research) are kept because they show how the signals behave as size varies, not because
they are design targets.

The goal has two halves, and they are separable:

1. **Understand difficulty** — define a measure of how hard a nonogram is that actually tracks how
   hard it feels to solve. This turns out to be two measures, not one: how much _work_ a solve takes,
   and how _tricky_ the techniques it demands are. See
   [The two-axis framing](#the-two-axis-framing).
2. **Control difficulty** — generate puzzles at a requested difficulty.

The seed idea was to count how many "moves" it takes to solve a puzzle: in a 15×15, a row clued
`14` is nearly free — the middle 13 cells are forced, and they all fall in a single move. A puzzle
where most of the board falls out of a few high-yield moves is easy; one where cells come out a
couple at a time is hard. That is a compression/entropy intuition, and it turns out to be one of
several distinct axes, each of which is measurable here.

### What exists today

- [solver.ts](../../src/logic/solver.ts) is a **line solver**: for each row/column it enumerates
  every placement of the clues consistent with the currently-known cells, then fills in the cells
  that agree across all of them. It sweeps rows then columns, repeatedly, until nothing changes.
- Difficulty is `rateDifficulty(passes)` in [solver.ts:246](../../src/logic/solver.ts#L246) — Easy
  ≤3 passes, Medium ≤10, Hard >10. A "pass" is one full sweep of every row _and_ every column.
- [puzzleGenerator.ts](../../src/logic/puzzleGenerator.ts) generates a random pattern, computes
  clues, rejects uniform lines, and accepts only if the line solver finishes — so every generated
  puzzle is guessing-free and uniquely solvable. Up to 100 attempts per seed.
- [patternGenerator.ts](../../src/logic/patternGenerator.ts) makes the pattern: uniform random
  values, one round of 8-neighbour averaging, thresholded at the median (so ~50% fill).
- The 10 premade puzzles in [puzzles.json](../../src/data/puzzles.json) carry a **hand-authored**
  `difficulty` string.
- Difficulty is displayed in two places: [App.tsx:193](../../src/App.tsx#L193) and
  [PuzzleSelector.tsx:38](../../src/components/PuzzleSelector.tsx#L38).

### The problem, measured

Across **450 generated puzzles** (150 each at 5×5, 10×10, 15×15):

| Size  | passes (min–max) | rated easy | rated medium | rated hard |
| ----- | ---------------- | ---------- | ------------ | ---------- |
| 5×5   | 1–5              | 148        | 2            | 0          |
| 10×10 | 2–5              | 109        | 41           | 0          |
| 15×15 | 3–8              | 29         | 121          | 0          |

Three failures:

1. **The Hard bucket is unreachable.** Nothing crossed 10 passes. The generator cannot currently
   produce a puzzle it would call hard.
2. **There is almost no dynamic range.** Pass count is a coarse integer spanning ~5 distinct values.
3. **It is mostly reading grid size back to you.** 5×5 → 99% easy, 15×15 → 81% medium. The rating
   carries very little information beyond the size the player already chose.

There is a fourth, structural problem. The line solver is _maximally strong per line_ — it
enumerates every placement. So it draws no distinction between "the overlap rule, obvious at a
glance" and "one forced cell found by sifting 400 candidate placements". Every deduction a human
would rank from trivial to fiendish is, to this solver, the same operation. **Measuring difficulty
requires a deliberately weaker, stratified solver** — one that solves the way a person does, reaching
for the cheapest technique that works. That is the opposite of the usual instinct to make a solver
stronger, and it is the single biggest implication in this document.

### "Difficulty" currently means two unrelated things

The premade labels track grid size, not solving effort:

| Puzzle                      | Size  | Hand label |
| --------------------------- | ----- | ---------- |
| house, tree, cross, diamond | 5×5   | easy       |
| heart                       | 7×7   | easy       |
| sailboat, star, cat         | 10×10 | medium     |
| flower, chess-knight        | 15×15 | hard       |

So a "hard" premade and a "hard" generated puzzle are rated on entirely different scales, and
neither scale is meaningful.

## Research

Three throwaway probes were run against the real solver and pattern generator to get numbers rather
than intuitions. They are saved outside the repo (scratchpad: `difficulty-probe.test.ts`,
`difficulty-probe3.test.ts`) and would become the calibration harness described in the
[Implementation Sketch](#implementation-sketch).

**Probe 1** — generated 150 accepted puzzles per size and recorded pass count, deduction-step count,
cells revealed per step, and how many lines were actionable at each step. Source of the table above.

**Probe 2** — swept the pattern generator's two knobs (target fill ratio × smoothing rounds) and
measured how the resulting difficulty signals and the generator's accept rate respond.

**Probe 3** — measured "opening generosity" (how much of the board falls out of a single overlap
sweep on a blank grid) and implemented a depth-1 trial solver to find out whether a harder-than-
line-solvable class is reachable at all.

### Probe 2: the pattern generator's knobs move difficulty

15×15, ~80 accepted puzzles per cell. "%context" is the share of deductions that required reading
already-known cells rather than pure overlap:

| fill | smoothing | steps (med) | cells/step | %context | accept rate |
| ---- | --------- | ----------- | ---------- | -------- | ----------- |
| 0.65 | 0         | 36          | 6.25       | 73%      | **86%**     |
| 0.65 | 2         | 39          | 5.77       | 70%      | 22%         |
| 0.50 | 1         | 45          | 5.00       | 84%      | 51%         |
| 0.50 | 0         | 63          | 3.57       | 91%      | 26%         |
| 0.35 | 2         | 42          | 5.36       | 92%      | 14%         |
| 0.35 | 1         | 54          | 4.33       | **95%**  | 10%         |
| 0.35 | 0         | —           | —          | —        | **0%**      |

Findings:

- **Fill ratio is a strong, controllable difficulty knob.** Denser patterns are easier on every
  signal measured.
- **Harder means rarer.** The accept rate falls from 86% to 10% across the same range, and the
  sparsest setting produced nothing usable in 400 attempts. Sparse patterns mostly fail because they
  admit _multiple_ solutions, not because they are hard-but-unique.
- Smoothing mainly affects the accept rate and step count; fill ratio dominates the technique mix.
- 10×10 behaves the same way (%context 67% → 93% across the same fill range), which suggests these
  signals are roughly comparable across grid sizes in a way that pass count is not.
- **Cost:** ~35ms per 15×15 candidate in the slowest regime measured.

### Probe 3: opening generosity, and whether a hard class exists (10×10 pilot)

10×10. **Small samples (n = 10–28) — directional only.** Superseded for design purposes by Probe 4;
kept because it is what prompted running the 15×15 version.

| fill | smoothing | line-solvable | needs depth-1 | multi-solution / deeper | opening % (med) | longest plateau |
| ---- | --------- | ------------- | ------------- | ----------------------- | --------------- | --------------- |
| 0.50 | 2         | 100%          | 0%            | 0%                      | **31%**         | 4               |
| 0.35 | 1         | 47%           | **13%**       | 40%                     | **7%**          | 3               |
| 0.30 | 0         | 0%            | 0%            | 100%                    | —               | —               |

- **Opening generosity separates sharply and costs almost nothing.** One sweep, no iteration:
  blobby puzzles hand you ~31% of the board immediately (p10=20, p90=38); sparse ones hand you ~7%
  (p10=2, p90=16). It plausibly matches the "how hard does this look before I start" feeling better
  than anything measured from the middle of the solve.
- **A genuinely harder class exists, but it is rare and expensive.** 13% of sparse patterns need a
  depth-1 hypothetical. Verifying that cost ~30ms per 10×10 puzzle and would scale considerably
  worse at 15×15.
- **Sparser is not a free path to harder.** At fill 0.30 nothing was solvable at any depth — the
  regime produces ambiguous puzzles, not hard ones. There is a narrow band where hard-and-unique
  lives.

### Probe 4: the same measurements at 15×15 — the ones that count

15×15, n = 22–57 per row. This is the size the feature targets, and several numbers differ enough
from the 10×10 pilot to change the design.

| fill | smooth | line-solvable | needs depth-1 | multi-solution | opening % (med, p10–p90) | plateau | cost/candidate |
| ---- | ------ | ------------- | ------------- | -------------- | ------------------------ | ------- | -------------- |
| 0.65 | 0      | **89%**       | 0%            | 11%            | **62%** (56–70)          | 4       | ~11ms          |
| 0.50 | 2      | 81%           | 0%            | 19%            | **24%** (15–35)          | 5       | ~9ms           |
| 0.40 | 1      | 37%           | 5%            | 59%            | **8%** (4–13)            | 5       | ~180ms         |
| 0.35 | 1      | 27%           | **17%**       | 57%            | **7%** (4–11)            | 3       | **~370ms**     |
| 0.35 | 2      | 45%           | 5%            | 50%            | **7%** (2–12)            | 5       | ~26ms          |

Four findings, two of which move the design:

- **Opening generosity is the standout signal at 15×15.** It spans **62% → 7%** — roughly a
  nine-fold separation, considerably wider than the 31% → 7% seen at 10×10. An easy 15×15 hands the
  player nearly two thirds of the board before they make a decision. It costs one sweep.
- **Plateau length (C10) is nearly flat at 15×15.** Medians of 3–5 across every regime, including
  regimes that differ ninefold on opening. It looked promising in the abstract and does not appear
  to discriminate at this size. This is a genuine negative result and it downgrades C10.
- **The Expert tier is reachable but costs real time.** 5–17% of candidates in the sparse band need
  a depth-1 hypothetical. At fill 0.35 / smooth 1 — the best Expert yield measured, 17% — candidates
  cost **~370ms each**, so finding one Expert puzzle takes roughly **six candidates, about two
  seconds**. That is 12× the 10×10 cost and it lands entirely on the main thread today.
- **The cost is dominated by rejection, not acceptance.** Depth-1 is slow precisely when it fails:
  an ambiguous puzzle forces the search to exhaust every hypothesis before giving up, and 50–59% of
  sparse candidates are ambiguous. Compare fill 0.35 / smooth 2 (50% ambiguous, ~26ms) against fill
  0.35 / smooth 1 (57% ambiguous, ~370ms). A cheap ambiguity pre-filter, or a bounded depth-1 search
  that abandons rather than exhausts, would likely recover most of this.

## The two-axis framing

Difficulty is really two things multiplied together:

1. **How much work is required to solve it** — the volume of deductions, regardless of how clever
   any one of them is.
2. **How tricky the techniques are** — the sophistication of the reasoning you have to reach for.

These are independent. A puzzle can be a long grind of entirely obvious moves (high work, low
technique), or a short puzzle with one genuinely nasty step (low work, high technique), and those
feel like different kinds of hard. Collapsing them into a single number before deciding how they
relate is how the current pass-count metric ended up meaningless.

This framing organizes everything below: **Family A is axis 1, Family B is axis 2.** Family C
(findability) sits somewhere between them, Family D approximates both without solving, and Family E
is how you'd validate any of it against real players.

It also explains the no-normalization decision cleanly. Grid size is not a separate thing to correct
for — it is an _input to axis 1_. A 15×15 requires more work than a 5×5, so it scores higher on
work, and that is simply true.

### What sudoku difficulty raters do, and what transfers

Sudoku solved this problem first, and the conventions are worth borrowing rather than reinventing.

**Every technique gets a fixed difficulty rating**, forming a ladder: naked and hidden singles at
the bottom, then pointing/claiming, then naked and hidden pairs, X-Wing, swordfish, XY-wing, unique
rectangles, up through forcing chains and nested forcing chains at the top. Sudoku Explainer's
rating for a puzzle is **the hardest technique required at any point in the solve** — a max, not a
sum. Hodoku keeps both: a max-technique tier _and_ a weighted score summed over every step.

Three things transfer directly:

- **The ladder itself is the right shape for axis 2.** The tier list in B7 below is the nonogram
  analogue of the sudoku technique list, and it should be built the same way — each technique a
  named, separately-implemented detector with a fixed cost.

- **The solver must always apply the cheapest applicable technique.** This is the load-bearing
  convention. If the solver is allowed to use a strong technique when a weak one would have done,
  you learn nothing about which techniques the puzzle actually _requires_. In sudoku this is
  non-negotiable, and it directly answers what was Open Question 3 for us.

- **The known weakness of max-only rating is instructive.** A sudoku that needs one X-Wing and is
  otherwise trivial rates the same as one that needs X-Wings twenty times, and rates _harder_ than a
  puzzle that takes two hundred grinding singles. That is exactly axis 1 being thrown away, and it
  is the most common complaint about SE ratings. Whatever we do, we should not repeat it — which is
  the argument for keeping both axes rather than reducing to a max.

One thing does **not** transfer cleanly. In sudoku, escalation is global: you scan the whole grid
for the cheapest available move. In a nonogram the unit is a line, and several techniques may apply
within one line at once, so "cheapest available technique" has to mean: sweep all 2N lines at tier
1; if nothing moves, sweep all of them at tier 2; and so on, dropping back to tier 1 the moment
anything changes. That policy also yields the Family C breadth signals for free.

## Candidate difficulty models

Fifteen models, grouped by what they actually measure. None is ruled out; the point of listing them
is that they capture genuinely different things and a composite can draw from more than one family.

### Family A — effort: how much work is it?

**A1. Solver passes.** The status quo. Dead per the measurements above; listed for completeness.

**A2. Deduction steps and cells-per-step.** The seed idea, made concrete. Rather than counting
sweeps, count discrete _deduction events_: each time solving one line reveals at least one new cell,
that is one move. A 15-wide row clued `14` reveals 13 cells in one move; a line that dribbles out one
cell per visit is expensive. Measured cells/step range: **2.5–7.0** overall, and **3.6–6.3**
within 15×15 alone. Real dynamic range and directly faithful to the original intuition. It is not
size-neutral (10×10 tops out around 5.5 where 15×15 reaches 7), but per Requirement 2 that no longer
matters — at a fixed 15×15 it needs no normalization.

**A15. Enumeration cost.** Charge each deduction by _how many candidate placements had to be sifted_
to find it. A cell forced among 3 candidates is easy to spot; one forced among 400 is not. This is a
direct proxy for "how hard was that to see", and it is nearly free — the solver already enumerates,
so it only has to count. Untested. Attractive because it approximates the technique ladder (below)
without implementing any techniques, though it would rate a mechanically-large-but-obvious line as
hard, which is exactly backwards.

### Family B — reasoning kind: what skill does it demand?

**B3. Overlap-only vs. needs-context.** A binary split: could this deduction have been found from
the clue and line length alone, or did it require reading cells already deduced? Measured range
**50–98%**, responds cleanly to generator knobs, and appears comparable across sizes. The best
single discriminator found, and cheap — it costs one extra `solveArray` call per line against a
blank line. It is also, precisely, the two-rung version of the ladder below.

**B7. The full human-technique ladder.** The models above measure _how much_; this measures _what
kind_, using the vocabulary players actually use:

| Tier | Technique              | What it is                                                               |
| ---- | ---------------------- | ------------------------------------------------------------------------ |
| 0    | Empty / full line      | Clue is `0`, or sum + gaps equals the line length; the line is immediate |
| 1    | Simple overlap         | A block longer than the line's slack; the overlap region is forced       |
| 2    | Edge anchoring         | A filled or empty cell at the boundary pins the first/last block         |
| 3    | Glue / block extension | A filled cell beside a known X extends into a block of known length      |
| 4    | Gap too small          | A run of unknowns between Xs shorter than the smallest remaining clue    |
| 5    | Completion             | All blocks accounted for; every remaining unknown is X                   |
| 6    | Segment partitioning   | The line splits into segments at Xs; clues get assigned to segments      |
| 7    | Forced placement       | A cell forced only by intersecting all valid placements — no shortcut    |
| 8    | Depth-1 contradiction  | Assume a cell, propagate, derive a contradiction (see B8)                |

Difficulty would then be some function of the highest tier required and how often the upper tiers
are needed. This is what commercial nonogram apps mean by difficulty, and it is by far the most
**explainable** — "this puzzle needs segment partitioning" is a sentence a player understands. Two
notes on cost: each tier is its own detector to write and test, making this the largest single piece
of work in any version of this feature; and the same detectors would later power a **hint system**
almost for free, which may justify the cost on its own.

**B8. Search depth.** Today anything not line-solvable is rejected outright. But depth is a real
difficulty axis: solvable by line logic alone (depth 0) versus requiring a one-cell hypothetical
("assume filled → contradiction → therefore empty", depth 1) versus deeper. Measured at 15×15: 5–17% of
sparse candidates need depth 1, at **~370ms per candidate** in the best-yielding regime — roughly
two seconds of work to find one Expert puzzle. **This is the only measured route past the current
ceiling where no generated puzzle is genuinely hard.** Costs a second solver mode and a generation
path slow enough to force the threading question below.

**B12. X-mark dependence.** How much of the solve requires reasoning from marked-empty cells rather
than filled ones. Players who do not diligently mark Xs hit a wall on high-dependence puzzles. A
distinctive axis that separates "casual-friendly" from "requires discipline" — probably a modifier
or a displayed tag rather than a spine. Untested.

### Family C — navigation: how hard is it to find the next move?

**C4. Search breadth and bottlenecks.** At each step, how many of the 2N lines are actionable? If
twelve are, the puzzle flows; if exactly one is, you scan the whole board hunting, and it feels hard
even when the deduction itself is trivial. Measured: bottleneck steps are ~0 in easy regimes and
only appear at all in the sparse/hard regime (mean 0.5 per solve). A hard-end discriminator only —
it cannot separate easy from medium.

**C9. Opening generosity.** The share of the board revealed by a single overlap sweep of a blank
grid. At 15×15 this spans **62% down to 7%** — a ninefold separation for essentially free, since it
needs no iteration and no solve loop. The widest-range and cheapest signal measured anywhere in this
document. It also captures first-impression difficulty, which none of the mid-solve metrics do.

**C10. Solve-curve plateaus.** Plot cells-known against step number. Easy puzzles rise smoothly or
front-load; hard ones have flat stretches where you grind out a cell at a time. Metric: the longest
run of steps each yielding ≤1 cell. It targets _frustration_ specifically — a puzzle with respectable
averages can still feel awful because of one long wall. **But it did not survive measurement:** at
15×15 the median is 3–5 across every generator regime tested, including regimes that differ ninefold
on opening generosity. **Dropped** (Open Question 10) — with the caveat recorded there that it was
measured under a solve policy the spec has since replaced, so the null result is softer than it
looks.

### Family D — static: no solving at all

**D5. Line entropy.** Count the possible placements of each line's clues and sum the logs — a clue
of `14` in a 15-wide line has 2 placements (1 bit); `[1,1,1]` has many. This is the compression
intuition taken literally, and it is cheap enough to use as a prefilter before paying for a solve.
Weakness: it ignores cross-line interaction, which is where most real nonogram difficulty lives.

**D11. Per-cell ambiguity.** For each unknown cell, the fraction of that line's valid placements
that fill it. Cells near 50/50 are maximally uninformative. Averaged across the solve, this is the
dynamic version of D5 and a more honest reading of "entropy" than the static count.

**D13. Clue-shape heuristics.** Count of 1-blocks (notoriously fiddly), clues per line, longest run,
variance of clue sizes. Free to compute. Weak alone, useful as a prefilter or a tiebreaker, and this
is how many hobby generators do it.

### Family E — ground truth

**E14. Empirical calibration from real play.** The `markLog` added for the replay feature
([replay.ts](../../src/logic/replay.ts)) already records every mark a player makes, in order.
Adding timing, undo counts, and mistake counts would give real human solve data to fit any of the
models above against. This is the actual ground truth — every model above is a guess at what humans
find hard. The obstacle is that single-player data is thin and the feedback loop is long.

### How the families relate

- A is **axis 1 (work)** and B is **axis 2 (technique)**; those are the two that matter. C measures
  **findability**, D approximates A and B without solving, E validates all of them.
- B3 is the two-rung version of B7; picking B7 subsumes it.
- D5 is the static approximation of A2; they will correlate.
- A15 is a cheap approximation of B7 that gets pathological cases backwards.
- C9 and C4/C10 are complementary: one measures the start, the others the middle.

## Candidate generation strategies

**G1. Pure rejection sampling.** Keep drawing random seeds until the measured score lands in the
target band. This is what [plan.md](../../plan.md) Phase 8 already sketches. Zero change to pattern
generation. Wastes most attempts at the hard end and, per Probe 2, cannot reach the sparsest regimes
at all.

**G2. Knob-biased sampling.** Parameterize [patternGenerator.ts](../../src/logic/patternGenerator.ts)
with fill ratio and smoothing rounds, choose a preset per target difficulty, then rejection-sample
within a narrow score band. Directly supported by the Probe 2 table. Small change — the CA already
has both knobs implicitly, they are just hardcoded (median threshold, one round).

Three weaknesses worth stating, since they are the case against G2 as the sole approach. **It steers
a proxy, not the target**: fill ratio correlates with difficulty but does not control it, so
rejection sampling is still doing the real work and the presets need recalibrating whenever the
score function changes — which it will, since Open Question 1 is unresolved. **The knob does double
duty**: lowering fill makes puzzles harder _and_ makes them less likely to be uniquely solvable at
all (27% line-solvable at fill 0.35 versus 89% at 0.65), so difficulty and acceptance are tangled
together rather than controlled separately. And **fill ratio is not a hidden knob**: a sparse puzzle
has many small clues, a dense one has few large ones, so the player can read the intended difficulty
off the clue numbers before starting. For procedurally generated abstract patterns this is a mild
concern rather than a serious one — arguably it is honest signposting — but it does mean every
Expert puzzle will look like the same kind of puzzle.

**G3. Local search / hill climbing.** Start from a random pattern, mutate cells, re-score, accept if
closer to the target. Converges on narrow targets reliably, but every evaluation costs a solve, so
it is the expensive option — plausible at 5×5/10×10, risky at 15×15 in a browser.

**G4. Offline puzzle bank.** ~~Run generation as a build-time script and ship puzzles bucketed by
difficulty as JSON. Instant and guaranteed at play time; gives up seed-based generation and grows
the bundle.~~ **Ruled out.** A shipped bank is finite, and the player must never run out of puzzles
to play. Endless supply is the point of having a generator at all, and no amount of latency saving
buys back a game that eventually stops producing puzzles. Recorded here because the latency problem
it was trying to solve is real — see G6, which solves it without the finiteness.

**G5. Hybrid.** G2 first; if the band is not hit within budget, fall back to G3 mutation from the
best candidate so far, or widen the band and report honestly.

**G9. Opportunistic classification — don't target at all.** Invert the problem. Instead of asking
"generate me a Hard puzzle", generate cheaply from a single high-yield preset, score whatever comes
out, and file it under the difficulty it turned out to be. Targeted generation is then only needed
when a specific bucket is empty.

This composes with G6, which already maintains a buffer per difficulty — the buffer is the thing
being filled, so filling it opportunistically costs nothing extra. And it is cheap: at fill 0.50 /
smooth 2, candidates cost ~9ms with an 81% accept rate, so a second of background work yields on the
order of a hundred scored puzzles spread across the easier tiers.

The limit is the tail. Probe 4 shows the common tiers come out of one preset happily, but Expert
comes only from the sparse regime and appears at 5–17% there — no amount of opportunistic sampling
from an easy preset will produce one. So G9 plausibly covers the bulk and something targeted (G2,
G3, or G5) is still needed for the rare tiers. That may be the right division of labour: cheap and
untargeted for what is common, expensive and targeted for what is rare.

**G6. Background pre-generation (rolling buffer).** Orthogonal to G1–G5 rather than an alternative
to them: whichever strategy produces a puzzle, run it _ahead of time_ — generate the next puzzle
while the player is solving the current one, and keep a small buffer of ready puzzles per
difficulty. The player's wait becomes zero even when generation takes seconds.

This is the shape G4 was reaching for, without the fatal flaw: the buffer is refilled by the live
generator, so the supply stays infinite. It is also the most promising answer to the Expert-tier
latency problem — Expert costs ~2 seconds to generate, but nobody has to watch it happen if it
happened during the previous puzzle. Costs: a buffer to manage and persist, and it composes with
(does not replace) the responsiveness question.

**G6a. Speculative generation during landing-page idle — covering the cold start.** G6 only helps from the
second puzzle onward; the very first puzzle of a session is exactly the case it misses. The fix is
to start generating once the session is up and idle, using the player's dead time on the landing
page —
reading it, picking a size, picking a difficulty, reaching for the button — as generation time. That
is easily several seconds, which more than covers even an Expert puzzle.

The problem is that at page load we do not yet know which difficulty they will pick, so speculation
has to guess. What makes the guess cheap and accurate is that **players are extremely repetitive
about difficulty**: whatever they played last time is overwhelmingly what they will play next. So
persist the last-played difficulty and speculate on that. The store already uses zustand `persist`
([gameStore.ts:312](../../src/store/gameStore.ts#L312)), so this is one more field in `partialize`
rather than new machinery. On a genuine first visit there is no history, so speculate on the default
tier.

What this implies:

- Speculation starts **on idle after first paint**, not during initial render — heavy CPU at render
  time would slow the landing page's first paint, trading a wait nobody notices for one they do.
- Generation must be **interruptible and resumable**, so that a player who clicks Play mid-
  speculation gets the in-flight work handed over rather than restarted. This is the same property
  the responsive-wait requirement already needs, so it is one design constraint, not two.
- A wrong guess costs wasted CPU, not correctness — the speculated puzzle is discarded and the
  player waits as they would have anyway.
- A speculated puzzle must be identical to one generated on demand for the same
  `(seed, size, difficulty)`, per Requirement 1.

### Cross-cutting generation concerns

These apply whichever strategy wins:

- **Seed determinism.** Puzzles are shared by seed ([LandingPage.tsx](../../src/components/LandingPage.tsx),
  the seed-entry flow). If difficulty becomes a generation input, then `(seed, size, difficulty)`
  must fully determine the puzzle, or shared seeds stop reproducing.
- **Generation latency is a presentation problem, not a performance problem.** ~2 seconds to
  generate an Expert 15×15 is an acceptable wait for an Expert puzzle. What matters is that the wait
  is _responsive and legible_, not that it is short.

  The catch is technical: `generateRandomPuzzle` currently runs synchronously on the main thread
  behind a `setTimeout(…, 10)`, so during those 2 seconds the browser cannot paint at all. A spinner
  would not spin and a loading message would not appear. So concurrency is still needed — a Web
  Worker, or a loop that yields between candidates — but its justification changes from "2s is too
  slow" to "we want to show something during those 2s". That is a much easier bar, and a yielding
  loop probably clears it.

  This also turns the wait into an opportunity. Generation has genuinely interesting internals:
  candidates tried, how many were rejected as ambiguous, whether the current best needed a depth-1
  deduction. Real progress beats a fake spinner, and it makes the Expert tier feel earned rather
  than slow — with room for jokey loading copy alongside it.

- **Failure behaviour.** With a target band, generation can fail in a new way: solvable puzzles that
  are the wrong difficulty. The UI needs to decide between retrying, widening the band, or telling
  the player.

## Requirements

Holding regardless of which model is chosen:

1. A puzzle's difficulty is **deterministic** — the same puzzle always rates the same. Ratings are
   displayed and puzzles are shared, so the measure cannot depend on solver iteration order or
   anything non-reproducible.
2. The score is **not normalized for grid size**. A larger puzzle genuinely is more work to solve,
   and normalizing that away would misreport it. Since the target is 15×15 throughout, comparability
   across sizes buys nothing and costs honesty. Difficulty means difficulty _of this puzzle_, size
   included.
3. The generator can be asked for a **target difficulty** and returns a puzzle at that difficulty,
   or fails in a way the UI can report.
4. **The supply of puzzles is unbounded.** The player must never run out. This rules out any design
   whose puzzles are enumerated ahead of shipping, however convenient the latency story.
5. Generated and premade puzzles are rated on **one scale**.
6. Every generated puzzle remains **uniquely solvable**. What may change is _how much reasoning_
   uniqueness requires, not whether it holds.
7. A player-visible generation wait is **capped at 10 seconds**, and stays **responsive and legible**
   throughout — the UI keeps painting and tells the player what is happening. A few seconds is fine;
   a frozen tab is not, and neither is an open-ended wait. The cap applies to waits the player is
   actually sitting through; background work (G6) and speculative work (G6a) block nobody and are
   bounded by battery sense rather than by this cap.

   The cap has a consequence: generation can now run out of budget before it finds a puzzle at the
   target difficulty. That makes failure behaviour a real path rather than a theoretical one — see
   Open Question 5.

## Design Decisions (settled so far)

Settled in discussion. Everything else is open.

### The target is generated 15×15 puzzles, and difficulty is not size-normalized

Tiers, thresholds, generator presets, and calibration all target 15×15. Other sizes get a rating
from the same function but are not tuned for and are not allowed to constrain the design.

_Rationale:_ 15×15 is what gets played. Designing for a range of sizes would force a normalization
that actively lies — a 15×15 is more work than a 5×5, and the rating should say so.

### The two axes stay separate, and both are shown

Difficulty is reported as **two independent ratings, not one number** — a technique rating from the
B7 ladder and a work rating from the volume of deductions. Something in the shape of "Advanced
techniques · moderate work".

_Rationale:_ the whole point of the two-axis framing is that a long grind of obvious moves and a
short puzzle with one nasty step are different kinds of hard. Collapsing them into a single score
throws that away again, and the sudoku precedent shows what it costs: SE's max-technique rating is
routinely criticised for calling a puzzle "hard" on the strength of one clever step while a
two-hundred-move grind rates easy. Apps that report both are generally better at conveying what a
puzzle will actually feel like.

The costs are real and accepted: two ratings take more UI space than one, and they ask the player to
read two things instead of one. On a phone-sized landing page that is not free.

### Each axis is a continuous score displayed as named tiers

Per axis, a continuous internal value drives generation targeting; named tiers are what the player
sees. Tier thresholds get calibrated against a generated corpus rather than guessed.

_Rationale:_ targeting a band needs a continuous quantity, but "73/100" is not meaningful to a
player. This also decouples the two: thresholds can move without the metric changing.

The continuous scores are the part to build. **How many tiers each axis gets, and what they are
called, is explicitly deferred** (Open Question 4) — those are claims about how puzzles feel, and
answering them needs real play experience across a spread of scores, which does not exist yet.
Nothing upstream is blocked by the gap: the bake-off targets raw score bands, and tier thresholds
are a thin layer added afterwards.

_Consequence:_ a generation target is now a **region in two dimensions**, not a point on a line.
"In band" means in band on both axes, which raises a question the bake-off has to answer — whether
every combination is actually reachable. "Expert techniques with light work" may simply not exist,
since the sparse patterns that demand depth-1 reasoning also tend to produce many small deductions.
The joint distribution needs measuring before the UI offers combinations that cannot be built.

### The generation strategy is chosen empirically — build them all, then measure

Rather than picking a strategy up front, implement G1, G2, G3, G5, and G9 behind a common interface
and run them against each other. The winner is decided by measurement, not argument.

_Rationale:_ this decision rests entirely on empirical findings nobody has yet. Every argument for
or against a strategy above is a prediction — G2 was in fact chosen on one set of predictions and
then reopened when G6/G6a changed the economics. The strategies are individually small once the
scoring machinery exists (that is the expensive part, and it is shared), so building all of them is
cheap relative to the cost of choosing wrong and rebuilding.

This also means the strategies must be **swappable behind one interface** — roughly
`(size, seed, target, budget) → { puzzle, stats }` — so the bake-off is a loop over implementations
rather than five separate experiments. That interface is worth getting right early; it is what makes
the comparison possible at all, and it is what lets the winner be changed later without touching
callers.

**What gets measured**, per strategy and per target tier:

- **Hit rate** — how often it lands a puzzle in the requested band at all.
- **Time to a hit** — median and, importantly, p90/p99. Requirement 7's 10-second cap is a
  statement about the tail, not the mean, and the mean is all that has been measured so far.
- **Candidates burned per hit** — the cost driver, and what separates "cheap and untargeted" from
  "expensive and precise".
- **Achieved-versus-requested difficulty, on both axes** — the joint distribution of what actually
  came out, not just whether it was in band. A strategy that clusters at one edge of the band is
  worse than its hit rate suggests, and the two-dimensional version also reveals which combinations
  of technique and work are reachable at all.
- **Variety** — whether a strategy's output is samey (G2's fill-ratio presets are the specific
  worry: every Expert puzzle looking like the same kind of puzzle).
- **Whether a cheap ambiguity pre-filter pays for itself** — implement the candidates from Open
  Question 11 and measure time saved against good candidates wrongly discarded. This is orthogonal
  to which strategy wins, since every strategy pays the same ambiguity tax on the sparse regime.

G4 is excluded (ruled out by Requirement 4). G6 and G6a are excluded because they are not selection
strategies — they hide latency and compose with whichever strategy wins.

### Generation runs in a Web Worker

Puzzle generation — pattern, scoring, solving, depth-1 search — runs off the main thread in a
dedicated Worker, not in a main-thread loop that yields between candidates.

_Rationale:_ for a foreground wait, a yielding loop would be enough; the UI only has to paint a
progress message every few hundred milliseconds. **The deciding case is G6**, which generates the
next puzzle _while the player is solving the current one_. A yielding loop still consumes the main
thread in chunks the size of one candidate — up to ~370ms for Expert — and this app's core
interaction is a touch drag across cells on a phone. A 370ms stall mid-drag is exactly the jank G6
exists to avoid inflicting. Background generation has to be genuinely invisible, and only a Worker
makes it so.

The fit is good. The solver and generator are already pure modules over plain data with no DOM
dependency, `Puzzle` structured-clones without special handling, and Vite supports module workers
directly via `new Worker(new URL('./…', import.meta.url), { type: 'module' })` with no build
configuration. Progress reporting for the loading display falls out naturally as `postMessage` from
the worker as candidates are tried and rejected.

Two things to get right:

- **Keep the Worker a thin shim.** All generation logic stays in pure modules; the worker file only
  receives messages, calls them, and posts results. Workers are awkward to exercise under
  vitest/jsdom, and this keeps every unit test — solver, ladder, scoring, strategies — running
  against plain functions that never instantiate a Worker.
- **Cancellation needs to be cooperative.** Speculative generation (G6a) gets abandoned whenever the
  player picks a different difficulty, so the generation loop should check an abort flag between
  candidates rather than relying on `terminate()`, which would throw away the partial work that
  Requirement 7's resumability wants to hand over.

Not planned, but worth knowing the door is open: candidates are independent, so several workers
could evaluate them in parallel and cut Expert generation time roughly linearly. Only worth doing if
the bake-off shows Expert is uncomfortably slow.

### Missing the target returns the best candidate found

When the 10-second budget runs out without a puzzle in the requested band, generation returns the
closest candidate it found and reports that puzzle's **actual** ratings, not the requested ones. It
never fails empty-handed and never mislabels.

_Rationale:_ Requirement 4 says the player is never left without a puzzle, and this is the cheapest
way to honour it. It also falls out of a decision already made: because the UI displays each
puzzle's measured ratings rather than the difficulty that was asked for, an off-target puzzle needs
no special handling. The display is honest by construction, and there is no "asked for Expert, got
Hard" state to carry around.

Two details this implies. The generator must **keep its best candidate as it goes** rather than
discarding rejects, which it currently does. And "best" needs defining over two axes now — nearest
in the technique/work plane, by some distance that may want to weight technique more heavily than
work, since that is the axis a player asking for Expert most likely cares about.

Marked _for now_: it is the sensible default, but if measurement shows near-misses are frequent
rather than rare, progressively widening the band may be the better behaviour.

### Premade puzzles are rated by the same metric, precomputed into the JSON

The hand-authored `difficulty` field in [puzzles.json](../../src/data/puzzles.json) is replaced by
computed ratings on both axes, written into the file by a script rather than derived at load. Some
premades will change rating — the current labels only track size.

_Rationale:_ the premades never change, so their ratings are constants, and recomputing a constant
on every page load is waste. It is also waste at the worst possible moment: G6a wants the first idle
period for speculative generation, and rating ten puzzles would be competing for exactly that
window. The cost is modest in absolute terms — tens of milliseconds — but it buys nothing, and
precomputing additionally makes any rating change reviewable in a diff.

_Cost:_ the stored ratings can drift from the scoring code. A CI test that recomputes them and
asserts they match what is in the file removes that risk cheaply, and doubles as a regression test on
the scoring function itself.

_Context:_ the premades exist mostly to show nonograms to people unfamiliar with them, not as the
main play path. Their ratings should be sane and honest; they are not worth optimising for.

### The technique ladder (B7) is built in full

The full named ladder, not the binary split. Accepted as the largest piece of work in the feature.

### An Expert tier requiring depth-1 search (B8) is in scope

Puzzles needing a one-cell hypothetical are accepted rather than rejected, and rated Expert.

_Rationale:_ it is the only measured route past the ceiling where no generated puzzle is genuinely
hard.

The cost is now measured rather than assumed: at 15×15, ~370ms per candidate and ~2 seconds to find
one Expert puzzle, with the time dominated by exhaustively rejecting ambiguous candidates rather
than by accepting good ones. Two consequences follow. First, the UI-blocking concern stops being
hypothetical — two seconds of frozen main thread is not shippable, so threading or budgeting is part
of this decision rather than a later optimization. Second, an ambiguity pre-filter or a
bounded-rather-than-exhaustive depth-1 search is worth trying before accepting that cost as fixed.

### A calibration harness ships, with a CI regression test

The probes become a committed script that sweeps knobs and prints score distributions, plus a test
asserting that generated puzzles at each target difficulty land in their band.

_Rationale:_ thresholds cannot be set honestly without a corpus, and a metric this indirect will
drift silently if the pattern generator or solver changes.

## Implementation Sketch

Provisional — the composite's components are still open, so this is shape, not commitment. It falls
into three phases, and the phase boundaries matter: the measurement machinery has to exist before
any strategy can be targeted at it, and the bake-off has to run before a strategy can be chosen.

**Phase 1 — measurement.** Steps 1–4: the stratified solver, the trace, depth-1, and the score.
Nothing generates anything yet; the deliverable is the ability to rate a puzzle.

**Phase 2 — strategies and bake-off.** Steps 5–7: the strategy interface, the five implementations,
and the harness that races them. The deliverable is data, and the decision that comes out of it.

**Phase 3 — product.** Steps 8–10: the winning strategy wired up, latency hidden behind G6/G6a, and
the UI.

**Phase 4 — hints.** Deferred, and out of scope here; see [Deferred: hints](#deferred-hints). Listed
only because Phase 1 makes one interface choice on its behalf.

1. **A stratified line solver** (new). The core new capability: a solver that finds the _cheapest_
   technique that makes progress on a line, rather than the strongest. One detector per ladder tier,
   with the existing enumerating `solveArray` as the tier-7 fallback. Each detector is a pure
   function over `(clues, line) → { cells, tier, evidence }` and is independently testable — the
   `evidence` field identifies which clue forced the result, which difficulty scoring ignores but
   [hints](#deferred-hints) will need.
2. **A traced solve** (new). Drive the stratified solver to completion, recording per step: which
   line, which tier, how many cells revealed, how many lines were actionable. Keep the **full tier
   distribution**, not just the maximum — axis 2's rating is currently the max (Open Question 12),
   but retaining the distribution makes revisiting that a scoring change rather than a re-run. Every model in
   families A, B, and C reads off this one trace. The step-selection policy is **cheapest applicable
   tier first**, with a deterministic tie-break — see the two-axis framing and Open Question 3.
3. **A depth-1 mode** for the solver, used when line logic stalls.
4. **A scoring function** turning a trace into a 0–100 score plus a tier.
5. **A strategy interface** — roughly `(size, seed, target, budget) → { puzzle, stats }`, with
   `stats` carrying candidates tried, time spent, and why candidates were rejected. Everything below
   implements it, and the bake-off harness and the UI both consume it. Getting this right early is
   what makes the comparison cheap.
6. **A parameterized pattern generator** — fill ratio and smoothing rounds as arguments rather than
   hardcoded (median threshold, one round). Needed by G2 and G5; the Probe 4 table gives starting
   presets at 15×15: fill 0.65 / smooth 0 for the easy end (89% accept, 62% opening), fill 0.50 /
   smooth 2 in the middle (81% accept, 24% opening), fill 0.35–0.40 for the hard end (27–37%
   accept, 7–8% opening).
7. **The five strategies** — G1 rejection sampling, G2 knob-biased, G3 hill climbing, G5 hybrid, G9
   opportunistic classification. Each is small given steps 1–6; the shared machinery is the
   expensive part.
8. **A bake-off harness** — runs every strategy against every target tier and reports hit rate, time
   distribution (median/p90/p99), candidates burned, achieved-versus-requested spread, and variety.
   This is the calibration script and the strategy comparison in one tool; it also produces the tier
   thresholds.
9. **Latency handling** — the generation Worker (a thin shim over the pure modules, with
   cooperative cancellation and progress `postMessage`), plus the G6 rolling buffer and G6a
   landing-page-idle speculation on top of it.
10. **Types and UI** — `Difficulty` gains Expert; `Puzzle` gains a numeric score; difficulty
    selectors appear in [LandingPage.tsx](../../src/components/LandingPage.tsx) and
    [PuzzleGenerator.tsx](../../src/components/PuzzleGenerator.tsx); the displays in
    [App.tsx](../../src/App.tsx) and [PuzzleSelector.tsx](../../src/components/PuzzleSelector.tsx)
    read the new rating; the generation wait gets its progress presentation.

## Deferred: hints

**Not in scope. Do not implement as part of this work.** Recorded because it is planned for a later
phase, and because one thing in Phase 1 should be shaped for it now rather than retrofitted.

The stratified solver is, almost exactly, a hint engine. A good hint is "here is the easiest move
available, and here is why" — and cheapest-applicable-tier-first is precisely the policy that finds
it. Once the ladder exists, giving a hint means running the same solver from the player's current
board and reporting its first deduction.

Two consequences for Phase 1, both cheap now and awkward later:

- **The traced solve must accept a starting grid**, not assume a blank one. Difficulty measurement
  always starts from blank, so it would be natural to hardcode that; a hint always starts from
  wherever the player is.
- **Detectors should return their evidence, not just their conclusion.** The sketch in step 1 has
  them returning `{ cells, tier }`, which is all difficulty scoring needs. A hint additionally needs
  to say _which clue_ in the line forced the result, so it can be explained in words — "row 7's clue
  of 9 is longer than the slack, so the middle 3 cells must be filled". Carrying that along costs
  little while the detectors are being written and means rewriting all of them if added later.

There is a pleasing loop here too: hint usage is exactly the kind of real-play signal that empirical
calibration (E14) wants. Which puzzles get hints requested, and at which tier the player got stuck,
would say more about actual difficulty than any of the models in this document.

## Test Plan

Sketch, pending the decisions above.

- **Per-technique unit tests** — each ladder detector against hand-built lines where the answer is
  known by inspection, including cases where a higher tier finds cells a lower tier cannot.
- **Trace determinism** — the same puzzle produces a byte-identical trace across runs.
- **Scoring** — hand-built puzzles at known extremes (a nearly-full grid; a sparse grid) land in the
  expected tiers; scores are stable across grid sizes for structurally similar puzzles.
- **Depth-1 solver** — a known puzzle requiring a hypothetical solves; a known multi-solution puzzle
  is rejected rather than solved.
- **Targeted generation** — at 15×15, for each target tier, the _chosen_ strategy lands puzzles in
  the target band (the CI regression test) within the 10-second cap. Expert's budget is the one at
  risk and should be asserted explicitly, against the tail rather than the mean.
- **The bake-off itself is not a test** — it is an experiment that runs once (and again whenever the
  score function or pattern generator changes) to produce a decision. Its harness ships, its
  assertions do not.
- **Premade rating freshness** — a CI test recomputes every premade's ratings and asserts they match
  the values stored in [puzzles.json](../../src/data/puzzles.json), so precomputed data cannot
  silently drift from the scoring code.
- **Existing tests** — [solver.test.ts](../../src/logic/solver.test.ts) and
  [puzzleGenerator.test.ts](../../src/logic/puzzleGenerator.test.ts) assert against the current
  rating and will need updating; the six component tests that hardcode a `difficulty` string in
  their fixtures will need the new shape.
- **E2E** — selecting a difficulty produces a puzzle labelled with it.
- `npm run validate` and `npm run test:e2e` before this is done.

## Open Questions

1. **How do the two axes combine?** The options were: show two independent ratings; use technique
   tier as the class with work as a modifier within it; sum into one 0–100 score; or a 2D matrix of
   named labels. _Resolved: two independent ratings, both shown — e.g. "Advanced techniques ·
   moderate work". Collapsing the axes is what the two-axis framing exists to avoid, and the sudoku
   precedent shows the cost of collapsing. See [the design decision](#the-two-axes-stay-separate-and-both-are-shown)._

   Still open beneath it: **where opening generosity (C9) belongs.** It is the strongest and cheapest
   signal measured, but it is arguably not a third axis — a generous opening just means a large
   supply of tier-1 deductions, so it may be a cheap proxy for the low end of both axes at once.
   Whether it earns a place in either rating, or is only a fast pre-filter during generation, is
   undecided.

2. **Should the score be normalized by grid size?** The options were: normalize so a 15×15 Easy is
   genuinely easy rather than easy-for-a-15×15; do not normalize, on the grounds that a 15×15 really
   _is_ more work than a 5×5 and pretending otherwise misleads; or display both ("15×15 · Medium").
   _Resolved: do not normalize. A larger puzzle requires more work to solve and the rating should say
   so — normalizing lies about it. Moot in practice anyway, since the target is 15×15 throughout.
   Requirement 2 has been rewritten accordingly._

3. **What is the step-selection policy for the traced solve?** When several lines are actionable, the
   trace depends on which one is taken. Options were: cheapest available tier first, highest yield
   first, or fixed order. _Resolved: cheapest available tier first — sweep all 2N lines at tier 1, and
   only escalate a tier when nothing at the current tier moves, dropping back to tier 1 whenever
   anything changes. This is the load-bearing convention in sudoku rating: a solver allowed to use a
   strong technique where a weak one would do tells you nothing about what the puzzle requires.
   Ties within a tier still need a deterministic order (rows before columns, then by index) to
   satisfy Requirement 1._

4. **How many tiers per axis, and what are they called?** **Deferred — do not decide or implement
   this yet.** Now two questions, since the axes are rated separately: axis 2 (technique) has a
   natural vocabulary from the ladder itself, while axis 1 (work) needs its own scale and it is less
   obvious how many bands it deserves. Easy/Medium/Hard/Expert no longer maps cleanly onto either
   axis alone. _The small-grid worry is resolved: only 15×15 is calibrated and it has ample range._

   _Deferred because the answer comes from playing, not from analysis._ Naming a tier is a claim
   about how a puzzle feels, and nobody has yet played a spread of puzzles at known scores. Build
   the continuous scores, generate across a range, play them, and the bands will suggest themselves.

   This is cheap to defer: tiering is a thin layer of thresholds over the continuous scores, added
   late. Nothing upstream depends on it — the bake-off can target raw score bands without names, and
   the strategies do not care what the bands are called.

5. **What happens when targeted generation runs out of budget?** The options were: hand back the
   closest candidate found; progressively widen the band as the budget depletes; or surface the
   failure and ask the player to retry. _Resolved (for now): return the best candidate found and
   report its actual difficulty accurately. See
   [the design decision](#missing-the-target-returns-the-best-candidate-found)._ Still worth
   measuring the Expert generation-time distribution during calibration, to find out how often this
   fires at all.

6. **How does Expert-tier generation avoid freezing the UI?** _Resolved: a Web Worker. See
   [the design decision](#generation-runs-in-a-web-worker)._ The earlier framing — that ~2 seconds
   is an acceptable wait, so this is about keeping the UI alive rather than making generation fast —
   still holds, but the mechanism is settled.

7. **Do the ladder detectors get reused for hints?** _Resolved: yes, as a later phase — after the
   difficulty and generation work lands. Hints are **deferred and must not be implemented as part of
   this spec**, but the detector interface is shaped for them now. See
   [Deferred: hints](#deferred-hints)._

8. **Should the premades be re-rated in the JSON instead of at load?** _Resolved: yes, precomputed
   into the JSON. Their ratings are constants, and computing them at load would compete with G6a
   speculative generation for the first idle period — the one window that matters most. See
   [the design decision](#premade-puzzles-are-rated-by-the-same-metric-precomputed-into-the-json)._

9. **Is empirical calibration (E14) worth pursuing later?** Every model here is a guess at what
   humans find hard, and the `markLog` infrastructure to check that guess already exists. Deferred,
   but worth recording as the thing that would turn this from a plausible model into a validated one.

10. **Does plateau length (C10) stay in?** _Resolved: dropped from the initial scoring. It measured
    nearly flat at 15×15 — median 3–5 across regimes that differ ninefold on opening generosity — so
    it earns no place on either axis._

    One caveat is worth recording rather than losing: that measurement was taken under a
    **highest-yield-first** solve policy, and the spec has since settled on **cheapest-tier-first**
    (Open Question 3). Plateaus are a property of solve order, and a greedy highest-yield solver
    deliberately front-loads the big reveals, which smooths the curve and would suppress exactly the
    signal C10 is looking for. So the flat result may be an artefact of the wrong policy rather than
    a property of the puzzles.

    This does not justify keeping it now — there is no evidence for it, and the work axis is cleaner
    without it. It does mean re-checking is nearly free once the real traced solve exists, since the
    trace already records everything needed. Worth a glance during calibration; not worth blocking
    on.

11. **Is there a cheap ambiguity pre-filter?** _How much it helps is empirical and folded into the
    Phase 2 bake-off. What kind of filter to build is a design question, and it has a good answer:
    make it sound — informative but never wrong._

    There are two soundness directions here and it is worth separating them, because only one is
    open:
    - **Acceptance soundness is already guaranteed and non-negotiable.** A puzzle is only ever
      accepted if the solver _proved_ it can be solved. No pre-filter can cause a broken or
      ambiguous puzzle to ship; the worst a bad filter does is discard good candidates, costing
      yield rather than correctness. So the safety property the principle is usually protecting is
      free here by construction.
    - **Rejection soundness is the open one, and is worth having.** A filter that _proves_ ambiguity
      when it fires, and says nothing otherwise, lets the expensive depth-1 search be skipped
      entirely on the candidates it catches — with no good candidates lost, because it never fires
      on a unique puzzle. Incomplete but never wrong, falling through to the full check when it has
      nothing to say. That is the A\*-admissible shape applied here.

    A concrete sound prover exists: **verified switching components.** The generating pattern is
    already known, so after line-solving stalls, look for two rows and two columns whose four
    intersection cells are still unknown and alternate filled/empty in that pattern. Swapping them
    yields a different grid. If all four affected lines produce _identical clues_ under the swap,
    a second valid solution has been exhibited and ambiguity is proven.

    The verification step is what makes it sound, and it cannot be skipped. In discrete tomography —
    where clues are row and column _counts_ — a 2×2 swap trivially preserves them. Nonogram clues
    encode ordered _block runs_, which a swap can merge or split, so the naive switching-component
    test is **unsound for nonograms**. Recomputing the four affected lines' clues and comparing is
    cheap and exact, and turns an unsound heuristic into a proof.

    Cost is favourable: bounded by pairs of rows times pairs of columns, restricted to the unknown
    region, at a handful of operations each — single-digit milliseconds against depth-1's ~370ms.

    Still to measure in the bake-off: what fraction of ambiguous candidates it actually catches. A
    sound filter that fires rarely saves nothing. The unsound-but-cheap options (a static
    line-entropy threshold from D5, a bounded search that abandons rather than exhausts) stay in the
    comparison as a fallback if the sound one turns out to be too incomplete to pay for itself —
    they cost yield, not correctness.

12. **On axis 2, is the rating the hardest technique required, or the distribution?** Options were:
    the max tier; the max plus a count of how often it is needed; a high percentile of the tier
    distribution; or a weighted sum over every step. _Resolved (for now): the **max** — the hardest
    technique the solve requires._

    _Rationale:_ the sudoku precedent uses a max, and its best-known flaw is that a puzzle needing
    one hard step rates the same as one needing twenty. That flaw does not bite here, because the
    thing it loses — how much of the solve was hard — is exactly what axis 1 carries. Separating the
    axes is what makes the simple choice safe.

    _This is cheap to change later, provided one thing:_ the trace should **record the full tier
    distribution** even though the score reads only the max. Then revisiting this is a change to the
    scoring function alone, not a re-run of the solver or the corpus. Recorded in step 2 of the
    implementation sketch.

13. **Which generation strategy wins?** _Resolved as to method: build G1, G2, G3, G5, and G9 behind
    one interface and decide by measurement — the question rests on empirical findings nobody has
    yet, and every argument so far has been a prediction._ The answer itself stays open until the
    bake-off runs. Note the sequencing: the bake-off needs a settled score function to target, so
    Open Question 1 has to land first. A plausible prior going in is that G9 covers the common tiers
    cheaply and something targeted handles Expert, but that is exactly the kind of prediction the
    measurement exists to check.

14. **Does the player choose both axes, or only one?** Two ratings are being _displayed_, but that
    does not settle what the generation UI asks for. Offering two independent selectors on a
    phone-sized landing page is a lot of choice for a "play now" flow, and some combinations may not
    be reachable anyway. Options: pick technique and let work fall out; pick a single blended
    preset and report both ratings afterwards; or offer both selectors and grey out unreachable
    combinations. This depends on the joint-distribution measurement from the bake-off.
