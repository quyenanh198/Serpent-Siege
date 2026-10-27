import { describe, expect, it } from 'vitest';
import { buildStageRecipe, stageSpeed } from '../src/core/difficulty';
import { World } from '../src/core/sim';
import { NO_RANKS } from '../src/core/stats';
import { STAGES } from '../src/core/stages';

function run(seed: number) {
  const stage = STAGES[0];
  const w = new World({
    path: stage.path,
    turret: stage.turret,
    ranks: NO_RANKS,
    seed,
    recipe: buildStageRecipe(stage, 'standard', seed),
    speed: stageSpeed(stage, 'standard'),
  });
  for (let i = 0; i < 10000; i++) {
    if (i % 37 === 0) w.setAim((i * 13) % 720, (i * 7) % 900);
    if (w.state === 'choosing') w.choose(i % 3);
    w.step();
  }
  return w.hash();
}

describe('determinism', () => {
  it('same seed + inputs give the same state after 10,000 steps', () => {
    expect(run(42)).toBe(run(42));
    expect(run(42)).not.toBe(run(43));
  });
});
