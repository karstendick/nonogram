/**
 * Runs the generation bake-off and prints the table the strategy decision is
 * made from. Also prints the score distribution the tier thresholds will
 * eventually be cut from.
 *
 * Usage: npm run bakeoff  (BAKEOFF_TRIALS / BAKEOFF_BUDGET_MS to adjust)
 */
import { it } from 'vitest';
import { BANDS, bandName, runBakeoff } from '../src/logic/generation/bakeoff';
import { STRATEGIES, g2KnobBiased } from '../src/logic/generation/strategies';

const TRIALS = Number(process.env.BAKEOFF_TRIALS ?? 6);
const BUDGET_MS = Number(process.env.BAKEOFF_BUDGET_MS ?? 4000);

it(
  'bake-off',
  () => {
    const { summaries } = runBakeoff(BANDS, {
      trialsPerCell: TRIALS,
      seedPrefix: 'bakeoff-v1',
      generation: { budgetMs: BUDGET_MS },
    });

    for (const target of BANDS) {
      const name = bandName(target);
      console.log(`\n=== ${name} ===`);
      console.log(
        'strategy'.padEnd(18),
        'hit'.padStart(5),
        'med ms'.padStart(8),
        'p90 ms'.padStart(8),
        'cands'.padStart(6),
        'tech'.padStart(9),
        'work'.padStart(9),
        'depth1'.padStart(7)
      );
      for (const { name: strategy } of STRATEGIES) {
        const s = summaries.find((x) => x.strategy === strategy && x.targetName === name);
        if (!s) continue;
        console.log(
          strategy.padEnd(18),
          `${Math.round(s.hitRate * 100)}%`.padStart(5),
          String(s.medianMs).padStart(8),
          String(s.p90Ms).padStart(8),
          String(s.medianCandidates).padStart(6),
          `${s.techniqueSpread[0]}-${s.techniqueSpread[1]}`.padStart(9),
          `${s.workSpread[0]}-${s.workSpread[1]}`.padStart(9),
          `${Math.round(s.depth1Rate * 100)}%`.padStart(7)
        );
      }
    }
  },
  1000 * 60 * 30
);

/**
 * Does the sound ambiguity pre-filter pay for itself?
 *
 * It is sound, so it never costs a good candidate — the only question is
 * whether it fires often enough to be worth running. Measured on the hardest
 * band, where depth-1 is the dominant cost and a cheap rejection helps most.
 */
it(
  'ambiguity filter A/B',
  () => {
    const hardest = BANDS[BANDS.length - 1];
    console.log('\nAmbiguity pre-filter, hardest band:');
    console.log(
      'filter'.padEnd(10),
      'hit'.padStart(5),
      'med ms'.padStart(8),
      'cands'.padStart(7),
      'proofs'.padStart(8)
    );

    for (const useAmbiguityFilter of [false, true]) {
      const times: number[] = [];
      let hits = 0;
      let candidates = 0;
      let proofs = 0;
      const trials = 8;

      for (let i = 0; i < trials; i++) {
        const result = g2KnobBiased(hardest, `ab-${i}`, { budgetMs: 5000, useAmbiguityFilter });
        times.push(result.stats.elapsedMs);
        candidates += result.stats.candidates;
        proofs += result.stats.ambiguityProofs;
        if (result.inBand) hits++;
      }

      times.sort((a, b) => a - b);
      console.log(
        (useAmbiguityFilter ? 'on' : 'off').padEnd(10),
        `${Math.round((hits / trials) * 100)}%`.padStart(5),
        String(times[Math.floor(times.length / 2)]).padStart(8),
        String(candidates).padStart(7),
        String(proofs).padStart(8)
      );
    }
  },
  1000 * 60 * 10
);
