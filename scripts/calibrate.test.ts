/**
 * The joint distribution of what we actually measure, at 15x15.
 *
 * Two raw quantities, deliberately not rescaled to 0-100: the hardest rung on
 * the technique ladder a solve requires, and the number of deductions it takes.
 * The rung is a max over a nine-step ladder, so it is ordinal with a handful of
 * reachable values — mapping it onto a percentage invented a precision the
 * measurement does not have. Deductions are a genuine count.
 *
 * This is the data any difficulty-level scheme has to be designed against.
 *
 * Usage: npm run calibrate
 */
import { it } from 'vitest';
import {
  calculateColumnClues,
  calculateRowClues,
  generateRandomPattern,
  hasUniformArray,
} from '../src/logic/patternGenerator';
import { solveWithDepth1 } from '../src/logic/difficulty/depth1';
import { openingGenerosity } from '../src/logic/difficulty/score';
import { TECHNIQUE_NAMES, Technique } from '../src/logic/difficulty/types';

const SIZE = Number(process.env.CALIBRATE_SIZE ?? 15);
const PER_SETTING = Number(process.env.CALIBRATE_N ?? 30);

const SETTINGS = [
  { fillRatio: 0.7, smoothingRounds: 0 },
  { fillRatio: 0.65, smoothingRounds: 0 },
  { fillRatio: 0.6, smoothingRounds: 2 },
  { fillRatio: 0.55, smoothingRounds: 1 },
  { fillRatio: 0.5, smoothingRounds: 2 },
  { fillRatio: 0.5, smoothingRounds: 0 },
  { fillRatio: 0.45, smoothingRounds: 1 },
  { fillRatio: 0.4, smoothingRounds: 1 },
  { fillRatio: 0.35, smoothingRounds: 1 },
  { fillRatio: 0.35, smoothingRounds: 2 },
];

interface Sample {
  rung: Technique;
  deductions: number;
  opening: number;
  fillRatio: number;
}

function quantiles(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  return { min: sorted[0], p10: q(0.1), med: q(0.5), p90: q(0.9), max: sorted[sorted.length - 1] };
}

it(
  'calibrate',
  () => {
    const samples: Sample[] = [];

    for (const params of SETTINGS) {
      let accepted = 0;
      for (let i = 0; accepted < PER_SETTING && i < PER_SETTING * 40; i++) {
        const pattern = generateRandomPattern(
          SIZE,
          `cal-${params.fillRatio}-${params.smoothingRounds}-${i}`,
          params
        );
        const rowClues = calculateRowClues(pattern);
        const columnClues = calculateColumnClues(pattern);
        if (hasUniformArray(rowClues, SIZE) || hasUniformArray(columnClues, SIZE)) continue;

        const lines = { rowClues, columnClues, width: SIZE, height: SIZE };
        const result = solveWithDepth1(lines);
        if (!result.solved) continue;
        accepted++;
        samples.push({
          rung: result.trace.maxTechnique,
          deductions: result.trace.steps.length,
          opening: openingGenerosity(lines),
          fillRatio: params.fillRatio,
        });
      }
    }

    const deductions = samples.map((s) => s.deductions);
    const d = quantiles(deductions);
    console.log(`\n${samples.length} puzzles at ${SIZE}x${SIZE}\n`);
    console.log(
      `deductions: min=${d.min} p10=${d.p10} median=${d.med} p90=${d.p90} max=${d.max}\n`
    );

    // Deduction buckets, chosen to split the observed range into readable columns.
    const edges = [d.p10, d.med, d.p90];
    const bucketOf = (n: number) => (n < edges[0] ? 0 : n < edges[1] ? 1 : n < edges[2] ? 2 : 3);
    const bucketLabels = [
      `<${edges[0]}`,
      `${edges[0]}-${edges[1] - 1}`,
      `${edges[1]}-${edges[2] - 1}`,
      `>=${edges[2]}`,
    ];

    const rungs = [...new Set(samples.map((s) => s.rung))].sort((a, b) => a - b);

    console.log('Joint distribution — hardest rung required vs deductions taken\n');
    console.log(
      'hardest rung'.padEnd(24),
      ...bucketLabels.map((l) => l.padStart(10)),
      'total'.padStart(8),
      'share'.padStart(7)
    );

    for (const rung of rungs) {
      const mine = samples.filter((s) => s.rung === rung);
      const counts = [0, 1, 2, 3].map(
        (b) => mine.filter((s) => bucketOf(s.deductions) === b).length
      );
      console.log(
        TECHNIQUE_NAMES[rung].padEnd(24),
        ...counts.map((c) => String(c).padStart(10)),
        String(mine.length).padStart(8),
        `${Math.round((mine.length / samples.length) * 100)}%`.padStart(7)
      );
    }

    const columnTotals = [0, 1, 2, 3].map(
      (b) => samples.filter((s) => bucketOf(s.deductions) === b).length
    );
    console.log(
      'total'.padEnd(24),
      ...columnTotals.map((c) => String(c).padStart(10)),
      String(samples.length).padStart(8)
    );

    console.log('\nDeductions by rung:');
    for (const rung of rungs) {
      const mine = samples.filter((s) => s.rung === rung).map((s) => s.deductions);
      const q = quantiles(mine);
      console.log(
        `  ${TECHNIQUE_NAMES[rung].padEnd(22)} n=${String(mine.length).padStart(3)}  min=${q.min} p10=${q.p10} med=${q.med} p90=${q.p90} max=${q.max}`
      );
    }

    console.log('\nOpening generosity (share of board from one overlap sweep), by rung:');
    for (const rung of rungs) {
      const mine = samples.filter((s) => s.rung === rung).map((s) => Math.round(s.opening * 100));
      const q = quantiles(mine);
      console.log(
        `  ${TECHNIQUE_NAMES[rung].padEnd(22)} med=${q.med}%  p10=${q.p10}%  p90=${q.p90}%`
      );
    }
  },
  1000 * 60 * 30
);
