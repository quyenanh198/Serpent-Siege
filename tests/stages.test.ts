import { describe, expect, it } from 'vitest';
import { playStage } from '../src/core/bot';
import { buildStageRecipe, segmentCount, segmentHp, endlessStart } from '../src/core/difficulty';
import { validateMap } from '../src/core/mapgen';
import { World } from '../src/core/sim';
import { NO_RANKS } from '../src/core/stats';
import { ENDLESS, STAGES } from '../src/core/stages';
import { generateMap } from '../src/core/mapgen';
import { DIFFICULTIES } from '../src/core/types';

describe('stage data', () => {
  it('has 20 stages in 2 worlds with both turret layouts', () => {
    expect(STAGES).toHaveLength(20);
    expect(new Set(STAGES.map((s) => s.world))).toEqual(new Set([1, 2]));
    expect(new Set(STAGES.map((s) => s.turretLayout))).toEqual(new Set(['center', 'bottom']));
  });

  it.each(STAGES.map((s) => [s.id, s] as const))('%s passes map validation', (_, s) => {
    const v = validateMap(s, segmentCount(s.number, 'expert') * 4);
    expect(v.errors).toEqual([]);
  });

  it('endless map passes validation', () => {
    expect(validateMap(ENDLESS).errors).toEqual([]);
  });

  it('generator makes valid maps for most seeds and validation rejects bad ones', () => {
    let ok = 0;
    for (let seed = 1; seed <= 100; seed++)
      if (validateMap(generateMap(seed, seed % 2 ? 'center' : 'bottom')).ok) ok++;
    expect(ok).toBeGreaterThanOrEqual(90);
    const bad = {
      turret: [360, 700] as [number, number],
      path: [
        [0, 700],
        [720, 700],
      ] as [number, number][],
    };
    expect(validateMap(bad).ok).toBe(false);
    const tight = {
      turret: [360, 1170] as [number, number],
      path: [
        [100, 300],
        [600, 300],
        [600, 320],
        [100, 320],
      ] as [number, number][],
    };
    expect(validateMap(tight).ok).toBe(false);
  });
});

describe('difficulty', () => {
  it('segment counts match the 08 §4a table', () => {
    const table: [number, number, number, number][] = [
      [1, 36, 40, 43],
      [5, 39, 43, 47],
      [10, 40, 44, 48],
      [15, 42, 46, 50],
      [20, 43, 47, 52],
    ];
    for (const [n, s, h, e] of table) {
      expect([segmentCount(n, 'standard'), segmentCount(n, 'hard'), segmentCount(n, 'expert')]).toEqual([
        s,
        h,
        e,
      ]);
    }
  });

  it('HP rises from 0.6× at the front to 1.6× at the tail, averaging ≈ B', () => {
    for (const n of [36, 43, 52]) {
      const hps = Array.from({ length: n }, (_, i) => segmentHp(100, i, n, 0.6, 1.6));
      expect(hps[0]).toBeCloseTo(60);
      expect(hps[n - 1]).toBeCloseTo(160);
      const avg = hps.reduce((a, b) => a + b) / n;
      expect(Math.abs(avg / 100 - 1.02)).toBeLessThan(0.03);
    }
  });

  it('Hard and Expert have more HP and segments than Standard', () => {
    const total = (d: (typeof DIFFICULTIES)[number]) =>
      buildStageRecipe(STAGES[4], d, 1)
        .filter((u) => u.kind === 'segment')
        .reduce((a, u) => a + u.maxHp, 0);
    expect(total('hard')).toBeGreaterThan(total('standard') * 1.5);
    expect(total('expert')).toBeGreaterThan(total('hard') * 1.4);
  });
});

describe('balance (sim bot)', () => {
  it('stage 1 Standard clears with zero shop ranks', () => {
    for (const seed of [1, 2, 3]) expect(playStage(STAGES[0], 'standard', NO_RANKS, seed).won).toBe(true);
  });
  it('stage 10 and 20 fail with zero ranks', () => {
    expect(playStage(STAGES[9], 'standard', NO_RANKS, 1).won).toBe(false);
    expect(playStage(STAGES[19], 'standard', NO_RANKS, 1).won).toBe(false);
  });
  it('stage 10 clears with a mid build, stage 20 with a strong build', () => {
    expect(
      playStage(STAGES[9], 'standard', { attack: 40, attackSpeed: 20, critChance: 5, critDamage: 3 }, 1).won,
    ).toBe(true);
    expect(
      playStage(STAGES[19], 'standard', { attack: 80, attackSpeed: 45, critChance: 25, critDamage: 20 }, 1)
        .won,
    ).toBe(true);
  });
  it('Expert is harder than Standard on 5 sample stages', () => {
    for (const i of [1, 5, 8, 12, 16]) {
      const st = STAGES[i];
      // the weakest build that clears Standard should fail Expert
      let a = 0;
      while (!playStage(st, 'standard', { ...NO_RANKS, attack: a }, 7).won) a += 2;
      expect(playStage(st, 'expert', { ...NO_RANKS, attack: a }, 7).won).toBe(false);
    }
  });
});

describe('endless', () => {
  it('starts at 1/5 of the best progress and grants the skipped upgrade picks', () => {
    expect(endlessStart(50)).toBe(10);
    const w = new World({
      path: ENDLESS.path,
      turret: ENDLESS.turret,
      ranks: NO_RANKS,
      seed: 1,
      endlessStart: 10,
    });
    expect(w.snake.units.find((u) => u.kind === 'segment')!.index).toBe(10);
    expect(w.progress).toBe(10);
    // upgrade balls after segment 2 then every 3–5: 2 or 3 balls before segment 10
    let picks = 0;
    while (w.state === 'choosing') {
      w.choose(0);
      picks++;
    }
    expect(picks).toBeGreaterThanOrEqual(2);
    expect(picks).toBeLessThanOrEqual(3);
  });

  it('keeps spawning segments and HP rises per segment', () => {
    const w = new World({ path: ENDLESS.path, turret: ENDLESS.turret, ranks: NO_RANKS, seed: 1 });
    const segs = w.snake.units.filter((u) => u.kind === 'segment');
    expect(segs.length).toBeGreaterThanOrEqual(30);
    expect(segs[5].maxHp).toBeGreaterThan(segs[4].maxHp);
    w.snake.units.splice(0, 20);
    w.step();
    expect(w.snake.segmentsLeft()).toBeGreaterThanOrEqual(30);
  });
});
