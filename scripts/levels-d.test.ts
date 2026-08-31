/**
 * Is option D workable — pick a rung, then a length band within that rung?
 *
 * Two things decide it. Whether each cell is cheap to generate, since a scheme
 * with a cell nobody can fill is no better than the 2x2 the data ruled out. And
 * whether the bands mean anything to a player: if "long" at the easiest rung is
 * the same number of deductions as "short" at the hardest, the control is
 * telling them something misleading.
 *
 * Usage: npm run levels-d
 */
import { it } from 'vitest';
import {
  calculateColumnClues,
  calculateRowClues,
  generateRandomPattern,
  hasUniformArray,
} from '../src/logic/patternGenerator';
import { solveWithDepth1 } from '../src/logic/difficulty/depth1';
import { TECHNIQUE_NAMES, Technique } from '../src/logic/difficulty/types';

const SAMPLE_N = Number(process.env.LEVELS_SAMPLE ?? 40);
const TRIALS = Number(process.env.LEVELS_TRIALS ?? 6);

const SETTINGS = [
  { fillRatio: 0.7, smoothingRounds: 0 },
  { fillRatio: 0.65, smoothingRounds: 0 },
  { fillRatio: 0.6, smoothingRounds: 2 },
  { fillRatio: 0.55, smoothingRounds: 1 },
  { fillRatio: 0.5, smoothingRounds: 2 },
  { fillRatio: 0.45, smoothingRounds: 1 },
  { fillRatio: 0.4, smoothingRounds: 1 },
  { fillRatio: 0.35, smoothingRounds: 1 },
];

/** The four rungs a level scheme would be built on. Below completion is ~1%. */
const RUNGS = [
  Technique.Completion,
  Technique.SegmentPartition,
  Technique.ForcedPlacement,
  Technique.Depth1Contradiction,
];

interface Measured {
  rung: Technique;
  deductions: number;
}

function measure(size: number, seed: string, params: (typeof SETTINGS)[number]): Measured | null {
  const pattern = generateRandomPattern(size, seed, params);
  const rowClues = calculateRowClues(pattern);
  const columnClues = calculateColumnClues(pattern);
  if (hasUniformArray(rowClues, size) || hasUniformArray(columnClues, size)) return null;
  const lines = { rowClues, columnClues, width: size, height: size };
  const result = solveWithDepth1(lines);
  if (!result.solved) return null;
  // Anything below completion is lumped in with it: too rare to be its own level.
  const rung =
    result.trace.maxTechnique < Technique.Completion
      ? Technique.Completion
      : result.trace.maxTechnique;
  return { rung, deductions: result.trace.steps.length };
}

function cuts(values: number[], bands: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  return Array.from(
    { length: bands - 1 },
    (_, i) => sorted[Math.floor((sorted.length * (i + 1)) / bands)]
  );
}

it(
  'option D',
  () => {
    const SIZE = 15;

    // Phase 1 — sample the space, and learn which knob setting favours each rung.
    const samples: (Measured & { setting: number })[] = [];
    for (let s = 0; s < SETTINGS.length; s++) {
      let accepted = 0;
      for (let i = 0; accepted < SAMPLE_N && i < SAMPLE_N * 40; i++) {
        const m = measure(SIZE, `d-${s}-${i}`, SETTINGS[s]);
        if (!m) continue;
        accepted++;
        samples.push({ ...m, setting: s });
      }
    }

    const presetFor = new Map<Technique, number>();
    for (const rung of RUNGS) {
      const bySetting = SETTINGS.map(
        (_, s) =>
          samples.filter((x) => x.setting === s && x.rung === rung).length /
          Math.max(1, samples.filter((x) => x.setting === s).length)
      );
      presetFor.set(rung, bySetting.indexOf(Math.max(...bySetting)));
    }

    console.log(`\n${samples.length} sampled puzzles at ${SIZE}x${SIZE}\n`);
    console.log('Best knob setting per rung, and how often that setting produces it:');
    for (const rung of RUNGS) {
      const s = presetFor.get(rung)!;
      const rate =
        samples.filter((x) => x.setting === s && x.rung === rung).length /
        Math.max(1, samples.filter((x) => x.setting === s).length);
      console.log(
        `  ${TECHNIQUE_NAMES[rung].padEnd(22)} fill ${SETTINGS[s].fillRatio}/smooth ${SETTINGS[s].smoothingRounds}  ${Math.round(rate * 100)}%`
      );
    }

    // Phase 2 — the band edges each scheme implies, and whether they overlap.
    for (const bands of [2, 3]) {
      console.log(`\n=== ${bands} length bands per rung ===\n`);
      console.log(
        'rung'.padEnd(24),
        ...Array.from({ length: bands }, (_, i) => `band ${i + 1}`.padStart(14))
      );

      const edgesFor = new Map<Technique, number[]>();
      for (const rung of RUNGS) {
        const mine = samples.filter((x) => x.rung === rung).map((x) => x.deductions);
        if (mine.length === 0) continue;
        const edges = cuts(mine, bands);
        edgesFor.set(rung, edges);
        const sorted = [...mine].sort((a, b) => a - b);
        const bounds = [sorted[0], ...edges, sorted[sorted.length - 1]];
        console.log(
          TECHNIQUE_NAMES[rung].padEnd(24),
          ...Array.from({ length: bands }, (_, i) => `${bounds[i]}-${bounds[i + 1]}`.padStart(14))
        );
      }

      // Phase 3 — what it costs to actually generate each cell.
      console.log('\ngeneration cost per cell (hit rate / median ms / median candidates):');
      for (const rung of RUNGS) {
        const edges = edgesFor.get(rung);
        if (!edges) continue;
        const setting = SETTINGS[presetFor.get(rung)!];
        const row: string[] = [];

        for (let band = 0; band < bands; band++) {
          const lo = band === 0 ? 0 : edges[band - 1];
          const hi = band === bands - 1 ? Infinity : edges[band];
          const times: number[] = [];
          const counts: number[] = [];
          let hits = 0;

          for (let t = 0; t < TRIALS; t++) {
            const started = Date.now();
            let candidates = 0;
            let hit = false;
            while (Date.now() - started < 6000) {
              candidates++;
              const m = measure(SIZE, `gen-${rung}-${band}-${t}-${candidates}`, setting);
              if (m && m.rung === rung && m.deductions >= lo && m.deductions < hi) {
                hit = true;
                break;
              }
            }
            times.push(Date.now() - started);
            counts.push(candidates);
            if (hit) hits++;
          }

          times.sort((a, b) => a - b);
          counts.sort((a, b) => a - b);
          row.push(
            `${Math.round((hits / TRIALS) * 100)}% ${times[Math.floor(TRIALS / 2)]}ms ${counts[Math.floor(TRIALS / 2)]}c`.padStart(
              18
            )
          );
        }
        console.log(TECHNIQUE_NAMES[rung].padEnd(24), ...row);
      }
    }
  },
  1000 * 60 * 30
);
