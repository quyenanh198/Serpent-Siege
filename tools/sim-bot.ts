/**
 * Real-game sim bot. Plays stages headless with perfect aim at the front ball.
 * Usage: npm run sim -- <stage> [difficulty] [attackRanks] [speedRanks] [critRanks] [critDmgRanks]
 *        npm run sim -- all     (zero-rank sweep over all stages)
 */
import { playStage } from '../src/core/bot';
import { STAGES } from '../src/core/stages';
import type { Difficulty } from '../src/core/types';

const [arg, diff = 'standard', a = '0', s = '0', c = '0', d = '0'] = process.argv.slice(2);
const ranks = { attack: +a, attackSpeed: +s, critChance: +c, critDamage: +d };
const list = arg === 'all' ? STAGES : [STAGES[Number(arg) - 1]];
for (const st of list) {
  const results = [1, 2, 3].map((seed) => playStage(st, diff as Difficulty, ranks, seed));
  console.log(
    `stage ${st.number} ${diff}: ` +
      results
        .map((r) => `${r.won ? 'WIN ' : 'lose'} ${r.time}s ${r.destroyed} segs ${r.picks} picks`)
        .join(' | '),
  );
}
