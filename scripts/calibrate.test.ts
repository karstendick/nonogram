/**
 * Prints the distribution of difficulty scores across pattern-generator
 * settings at 15x15.
 *
 * This is what the tier thresholds get cut from — deliberately not cut here,
 * because naming a tier is a claim about how a puzzle feels and that needs real
 * play experience across a spread of scores. What this produces is the spread.
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
import { rateTrace } from '../src/logic/difficulty/score';
import { TECHNIQUE_NAMES } from '../src/logic/difficulty/types';

const SIZE = Number(process.env.CALIBRATE_SIZE ?? 15);
const PER_SETTING = Number(process.env.CALIBRATE_N ?? 25);

const SETTINGS = [
  { fillRatio: 0.65, smoothingRounds: 0 },
  { fillRatio: 0.65, smoothingRounds: 2 },
  { fillRatio: 0.55, smoothingRounds: 1 },
  { fillRatio: 0.5, smoothingRounds: 2 },
  { fillRatio: 0.5, smoothingRounds: 0 },
  { fillRatio: 0.4, smoothingRounds: 1 },
  { fillRatio: 0.35, smoothingRounds: 1 },
];

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  return sorted.length === 0
    ? { min: 0, p25: 0, med: 0, p75: 0, max: 0 }
    : { min: sorted[0], p25: q(0.25), med: q(0.5), p75: q(0.75), max: sorted[sorted.length - 1] };
}

it(
  'calibrate',
  () => {
    const allTechnique: number[] = [];
    const allWork: number[] = [];
    const allPerCell: number[] = [];
    const ladderUse = new Map<string, number>();

    console.log(`\n15x15 difficulty distribution (${PER_SETTING} accepted per setting)\n`);
    console.log(
      'fill/smooth'.padEnd(13),
      'accept'.padStart(7),
      'technique (min/med/max)'.padStart(24),
      'work (min/med/max)'.padStart(20),
      'open%'.padStart(6),
      'depth1'.padStart(7)
    );

    for (const params of SETTINGS) {
      const technique: number[] = [];
      const work: number[] = [];
      const opening: number[] = [];
      const perCell: number[] = [];
      let tried = 0;
      let depth1 = 0;

      for (let i = 0; technique.length < PER_SETTING && tried < PER_SETTING * 25; i++) {
        tried++;
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
        if (!result.lineSolvable) depth1++;

        const rating = rateTrace(result.trace, lines);
        technique.push(rating.technique);
        work.push(rating.work);
        opening.push(rating.openingGenerosity);
        perCell.push(rating.deductions / (SIZE * SIZE));
        allTechnique.push(rating.technique);
        allWork.push(rating.work);
        const name = TECHNIQUE_NAMES[rating.maxTechnique];
        ladderUse.set(name, (ladderUse.get(name) ?? 0) + 1);
      }

      const t = stats(technique);
      const o = stats(opening.map((x) => Math.round(x * 100)));
      const pc = stats(perCell.map((x) => Math.round(x * 1000) / 1000));
      allPerCell.push(...perCell);
      console.log(
        `${params.fillRatio}/${params.smoothingRounds}`.padEnd(13),
        `${Math.round((technique.length / Math.max(1, tried)) * 100)}%`.padStart(7),
        `${t.min}/${t.med}/${t.max}`.padStart(24),
        `${pc.min}/${pc.med}/${pc.max}`.padStart(22),
        String(o.med).padStart(6),
        `${Math.round((depth1 / Math.max(1, technique.length)) * 100)}%`.padStart(7)
      );
    }

    console.log('\nHardest technique required, across everything generated:');
    for (const [name, count] of [...ladderUse.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${name.padEnd(22)} ${count}`);
    }

    const t = stats(allTechnique);
    const w = stats(allWork);
    console.log(
      `\ntechnique axis overall: min=${t.min} p25=${t.p25} med=${t.med} p75=${t.p75} max=${t.max}`
    );
    console.log(
      `work axis overall:      min=${w.min} p25=${w.p25} med=${w.med} p75=${w.p75} max=${w.max}`
    );
  },
  1000 * 60 * 30
);
