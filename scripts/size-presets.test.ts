/**
 * Which knob setting produces each rung, at each grid size — and whether it
 * produces it at all.
 *
 * The 15x15 presets in levels.ts were measured this way (phase 1 of
 * scripts/levels-d.test.ts, which hardcodes 15). Seed entry offers 5x5 and
 * 10x10 as well, so the same measurement has to exist for them: a level is
 * offered at a size only if some setting actually produces that rung there.
 *
 * Two things come out of this, both needed by docs/specs/seed-sharing-fixes.md:
 * the per-size preset table, and the availability matrix — a rung no setting
 * reaches is a level that size does not get to offer.
 *
 * Usage: npm run size-presets   (SIZES=5,10 PER_SETTING=60 to narrow or deepen)
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

const SIZES = (process.env.SIZES ?? '5,10,15').split(',').map(Number);
const PER_SETTING = Number(process.env.PER_SETTING ?? 40);
const TRIALS = Number(process.env.TRIALS ?? 8);
/** The budget generatePuzzle gives a seed-entry generation. */
const BUDGET_MS = Number(process.env.BUDGET_MS ?? 5000);

/** The same knob settings calibrate.test.ts sweeps, so the runs are comparable. */
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

/** The four rungs the levels are built on. Below completion is ~1%, folded in. */
const RUNGS = [
  Technique.Completion,
  Technique.SegmentPartition,
  Technique.ForcedPlacement,
  Technique.Depth1Contradiction,
];

const LEVEL_NAMES = ['Easy', 'Medium', 'Hard', 'Evil'];

function measure(size: number, seed: string, params: (typeof SETTINGS)[number]) {
  const pattern = generateRandomPattern(size, seed, params);
  const rowClues = calculateRowClues(pattern);
  const columnClues = calculateColumnClues(pattern);
  if (hasUniformArray(rowClues, size) || hasUniformArray(columnClues, size)) return null;
  const lines = { rowClues, columnClues, width: size, height: size };
  const result = solveWithDepth1(lines);
  if (!result.solved) return null;
  const rung =
    result.trace.maxTechnique < Technique.Completion
      ? Technique.Completion
      : result.trace.maxTechnique;
  return { rung, deductions: result.trace.steps.length };
}

const label = (s: (typeof SETTINGS)[number]) => `fill ${s.fillRatio}/sm ${s.smoothingRounds}`;

it(
  'size presets',
  () => {
    for (const size of SIZES) {
      const started = Date.now();
      const samples: { rung: Technique; setting: number; deductions: number }[] = [];
      let drawn = 0;

      for (let s = 0; s < SETTINGS.length; s++) {
        let accepted = 0;
        for (let i = 0; accepted < PER_SETTING && i < PER_SETTING * 40; i++) {
          drawn++;
          const m = measure(size, `sp-${size}-${s}-${i}`, SETTINGS[s]);
          if (!m) continue;
          accepted++;
          samples.push({ ...m, setting: s });
        }
      }

      console.log(
        `\n\n=========== ${size}x${size} — ${samples.length} accepted of ${drawn} drawn, ${Math.round((Date.now() - started) / 1000)}s ===========\n`
      );

      // Rung distribution per setting: the raw table everything else reads from.
      console.log('rung produced, by knob setting (row % of that setting):\n');
      console.log(
        'setting'.padEnd(18),
        ...RUNGS.map((r, i) => `${LEVEL_NAMES[i]}`.padStart(12)),
        'n'.padStart(6)
      );
      for (let s = 0; s < SETTINGS.length; s++) {
        const mine = samples.filter((x) => x.setting === s);
        console.log(
          label(SETTINGS[s]).padEnd(18),
          ...RUNGS.map((r) => {
            const n = mine.filter((x) => x.rung === r).length;
            return `${n} (${Math.round((n / Math.max(1, mine.length)) * 100)}%)`.padStart(12);
          }),
          String(mine.length).padStart(6)
        );
      }

      // Best setting per rung, and how often it lands there. This is the preset
      // table, and the rate is the reachability signal.
      console.log('\nbest setting per rung:\n');
      for (let i = 0; i < RUNGS.length; i++) {
        const rung = RUNGS[i];
        const rates = SETTINGS.map((_, s) => {
          const mine = samples.filter((x) => x.setting === s);
          return mine.length === 0 ? 0 : mine.filter((x) => x.rung === rung).length / mine.length;
        });
        const best = rates.indexOf(Math.max(...rates));
        const rate = rates[best];
        const total = samples.filter((x) => x.rung === rung).length;
        const verdict = rate === 0 ? 'UNREACHABLE' : rate < 0.1 ? 'marginal' : 'available';
        console.log(
          `  ${LEVEL_NAMES[i].padEnd(7)} ${TECHNIQUE_NAMES[rung].padEnd(22)} ` +
            `${label(SETTINGS[best]).padEnd(18)} ${`${Math.round(rate * 100)}%`.padStart(5)}  ` +
            `(${total} of ${samples.length} overall)  ${verdict}`
        );
      }

      // Phase 2 — what generation actually costs with that preset.
      //
      // The hit rate above is not the availability answer on its own: a draw at
      // 5x5 is ~1000x cheaper than at 15x15, so a rate that would be hopeless on
      // a big grid is instant on a small one. What decides whether a level can
      // be offered at a size is whether the real budget finds one.
      console.log(
        `\nreaching each rung with its best preset (${TRIALS} trials, ${BUDGET_MS}ms budget):\n`
      );
      for (let i = 0; i < RUNGS.length; i++) {
        const rung = RUNGS[i];
        const rates = SETTINGS.map((_, s) => {
          const mine = samples.filter((x) => x.setting === s);
          return mine.length === 0 ? 0 : mine.filter((x) => x.rung === rung).length / mine.length;
        });
        const setting = SETTINGS[rates.indexOf(Math.max(...rates))];

        const times: number[] = [];
        const counts: number[] = [];
        let hits = 0;
        for (let t = 0; t < TRIALS; t++) {
          const began = Date.now();
          let candidates = 0;
          let hit = false;
          while (Date.now() - began < BUDGET_MS) {
            candidates++;
            const m = measure(size, `reach-${size}-${rung}-${t}-${candidates}`, setting);
            if (m && m.rung === rung) {
              hit = true;
              break;
            }
          }
          times.push(Date.now() - began);
          counts.push(candidates);
          if (hit) hits++;
        }
        times.sort((a, b) => a - b);
        counts.sort((a, b) => a - b);
        const mid = Math.floor(TRIALS / 2);
        console.log(
          `  ${LEVEL_NAMES[i].padEnd(7)} ${label(setting).padEnd(18)} ` +
            `found ${`${Math.round((hits / TRIALS) * 100)}%`.padStart(4)}  ` +
            `median ${String(times[mid]).padStart(5)}ms / ${String(counts[mid]).padStart(5)} draws  ` +
            `worst ${String(times[times.length - 1]).padStart(5)}ms`
        );
      }

      // Deduction spread, for the record — it is what the second axis reports.
      console.log('\ndeductions by rung:');
      for (let i = 0; i < RUNGS.length; i++) {
        const mine = samples
          .filter((x) => x.rung === RUNGS[i])
          .map((x) => x.deductions)
          .sort((a, b) => a - b);
        if (mine.length === 0) continue;
        const q = (p: number) => mine[Math.min(mine.length - 1, Math.floor(p * mine.length))];
        console.log(
          `  ${LEVEL_NAMES[i].padEnd(7)} n=${String(mine.length).padStart(4)}  min=${mine[0]} med=${q(0.5)} p90=${q(0.9)} max=${mine[mine.length - 1]}`
        );
      }
    }
  },
  1000 * 60 * 60
);
