/**
 * Measures how many Attack ranks the sim bot needs to clear each Standard stage and writes
 * src/core/data/hpTweaks.json so every stage sits the same distance from the pure HP-growth curve.
 * Each run moves the tweaks halfway toward the target; run it a few times until the offsets are small.
 * Usage: npx tsx tools/tune-stages.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { playStage } from '../src/core/bot';
import { hpTweak } from '../src/core/difficulty';
import { STAGES } from '../src/core/stages';
import type { StageData } from '../src/core/types';

const FILE = join(dirname(fileURLToPath(import.meta.url)), '../src/core/data/hpTweaks.json');
/** Target: ranks needed = growth-only ranks + OFFSET (stage 1 is left easy as a tutorial). */
const OFFSET = -6;
const SEEDS = [11, 12, 13, 14, 15, 16, 17, 18];

const ranks = (r: number) => ({ attack: r, attackSpeed: 0, critChance: 0, critDamage: 0 });

/** Fractional attack ranks needed, measured by a 1-rank bisection then linear in log space. */
function needed(stage: StageData): number {
  const wins = (r: number) => SEEDS.filter((s) => playStage(stage, 'standard', ranks(r), s).won).length;
  let lo = -40;
  let hi = 140;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (wins(m) >= 6) hi = m;
    else lo = m;
  }
  return hi;
}

// Runs on top of the current tweaks, so repeated runs converge.
const out = JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, number>;
for (const st of STAGES) {
  if (st.number === 1) continue;
  const target = Math.log((Math.pow(1.25, st.number - 1) * st.snake.segments) / 36) / Math.log(1.05) + OFFSET;
  const diff = needed(st) - target;
  out[String(st.number)] = Math.round(hpTweak(st.number) * Math.pow(1.05, -diff / 2) * 1000) / 1000;
  console.log(`stage ${st.number}: off by ${diff.toFixed(1)} ranks, tweak ${out[String(st.number)]}`);
}
writeFileSync(FILE, JSON.stringify(out, null, 2) + '\n');
