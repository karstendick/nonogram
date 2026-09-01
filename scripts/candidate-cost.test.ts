import { it } from 'vitest';
import {
  calculateColumnClues,
  calculateRowClues,
  generateRandomPattern,
  hasUniformArray,
} from '../src/logic/patternGenerator';
import { solveWithDepth1 } from '../src/logic/difficulty/depth1';
import { Technique } from '../src/logic/difficulty/types';

/** How expensive can a single candidate get on the hardest preset? */
it(
  'candidate cost',
  () => {
    const SIZE = 15;
    const params = { fillRatio: 0.35, smoothingRounds: 1 };
    const CAP = Number(process.env.TRIAL_CAP ?? 0) || Infinity;
    const accepted: { ms: number; trials: number }[] = [];
    const rejected: { ms: number; trials: number }[] = [];

    for (let i = 0; i < 200; i++) {
      const pattern = generateRandomPattern(SIZE, `cost-${i}`, params);
      const rowClues = calculateRowClues(pattern);
      const columnClues = calculateColumnClues(pattern);
      if (hasUniformArray(rowClues, SIZE) || hasUniformArray(columnClues, SIZE)) continue;
      const lines = { rowClues, columnClues, width: SIZE, height: SIZE };

      const started = Date.now();
      const result = solveWithDepth1(lines, CAP);
      const ms = Date.now() - started;
      const record = { ms, trials: result.trace.depth1Trials };
      if (result.solved && result.trace.maxTechnique === Technique.Depth1Contradiction) {
        accepted.push(record);
      } else {
        rejected.push(record);
      }
    }

    const report = (name: string, rows: { ms: number; trials: number }[]) => {
      if (rows.length === 0) return console.log(`${name}: none`);
      const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
      const tr = rows.map((r) => r.trials).sort((a, b) => a - b);
      const q = (a: number[], p: number) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
      console.log(
        `${name.padEnd(28)} n=${String(rows.length).padStart(3)}  ms med=${q(ms, 0.5)} p90=${q(ms, 0.9)} max=${ms[ms.length - 1]}   trials med=${q(tr, 0.5)} p90=${q(tr, 0.9)} max=${tr[tr.length - 1]}`
      );
    };

    console.log(`\nSingle-candidate cost on the Evil preset, trial cap ${CAP}\n`);
    report('accepted (contradiction)', accepted);
    report('rejected', rejected);
  },
  1000 * 60 * 20
);
