import { describe, expect, it } from 'vitest';
import balance from '../src/core/data/balance.json';
import { upgradeSlots, buildStageRecipe } from '../src/core/difficulty';
import { Rng } from '../src/core/rng';
import {
  describe as describeUpgrade,
  offerUpgrades,
  RUN_UPGRADES,
  type RunUpgradeId,
} from '../src/core/runUpgrades';
import { computeStats, NO_RANKS } from '../src/core/stats';
import { STAGES } from '../src/core/stages';
import type { UnitSpec } from '../src/core/types';
import { lineWorld, placeHead, segs } from './helpers';

describe('upgrade balls', () => {
  it('first right after segment 2, then every 3–5 segments (100 seeds)', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const slots = upgradeSlots(40, 2, [3, 5], new Rng(seed));
      expect(slots[0]).toBe(2);
      for (let i = 1; i < slots.length; i++) {
        const gap = slots[i] - slots[i - 1];
        expect(gap).toBeGreaterThanOrEqual(3);
        expect(gap).toBeLessThanOrEqual(5);
      }
    }
  });

  it('stage recipe puts the upgrade ball after the 2nd segment with half its HP', () => {
    const r = buildStageRecipe(STAGES[0], 'standard', 5);
    expect(r[0].kind).toBe('segment');
    expect(r[1].kind).toBe('segment');
    expect(r[2].kind).toBe('upgrade');
    expect(r[2].maxHp).toBeCloseTo(r[1].maxHp * 0.5, 6);
  });

  it('breaking an upgrade ball pauses and offers 3 distinct upgrades; picking resumes', () => {
    const recipe: UnitSpec[] = [{ kind: 'upgrade', type: 'normal', maxHp: 5, index: 0 }, ...segs(3, 1000)];
    const w = lineWorld(recipe);
    placeHead(w, 400);
    w.setAim(w.ballX[0], 200);
    w.turret.angle = w.turret.target;
    for (let i = 0; i < 120 && w.state === 'playing'; i++) w.step();
    expect(w.state).toBe('choosing');
    expect(new Set(w.offer).size).toBe(3);
    const head = w.snake.headPos;
    w.step();
    expect(w.snake.headPos).toBe(head); // paused
    const pick = w.offer[0];
    w.choose(0);
    expect(w.state).toBe('playing');
    expect(w.stacks[pick]).toBe(1);
  });

  it('offers never include maxed upgrades', () => {
    const stacks = Object.fromEntries(RUN_UPGRADES.map((u) => [u.id, u.max])) as Record<RunUpgradeId, number>;
    stacks.frost = 0;
    stacks.keen = 0;
    const offer = offerUpgrades(stacks, new Rng(3));
    expect(offer.sort()).toEqual(['frost', 'keen']);
  });

  it('card text comes from the table', () => {
    expect(describeUpgrade('damage')).toBe('+20% bullet damage');
  });
});

describe('run upgrade effects', () => {
  const base = computeStats(NO_RANKS);
  const one = (id: RunUpgradeId) => computeStats(NO_RANKS, { [id]: 1 });
  it('damage +20%', () => expect(one('damage').damage).toBeCloseTo(base.damage * 1.2));
  it('rapid +20% fire rate', () => expect(one('rapid').fireRate).toBeCloseTo(base.fireRate * 1.2));
  it('multishot +1 bullet', () => expect(one('multishot').bullets).toBe(2));
  it('pierce +1', () => expect(one('pierce').pierce).toBe(1));
  it('ricochet +1', () => expect(one('ricochet').ricochet).toBe(1));
  it('explosive 50% splash', () => expect(one('explosive').splash).toBeCloseTo(0.5));
  it('frost 10% slow', () => expect(one('frost').frost).toBeCloseTo(0.1));
  it('keen +5% crit', () => expect(one('keen').critChance).toBeCloseTo(0.05));
  it('deadly +25% crit damage', () => expect(one('deadly').critDamage).toBeCloseTo(1.75));
  it('chain jumps to 2 more segments', () => expect(one('chain').chain).toBe(2));
  it('head hunter +50% vs head', () => expect(one('headHunter').headBonus).toBeCloseTo(0.5));
  it('stacks add up', () => {
    const s = computeStats(NO_RANKS, { damage: 3, multishot: 2, chain: 2 });
    expect(s.damage).toBeCloseTo(base.damage * 1.6);
    expect(s.bullets).toBe(3);
    expect(s.chain).toBe(3);
  });

  it('rewind pushes the snake back 15% of the path', () => {
    const recipe: UnitSpec[] = [{ kind: 'upgrade', type: 'normal', maxHp: 1, index: 0 }, ...segs(3, 1000)];
    const w = lineWorld(recipe);
    placeHead(w, 400);
    w.state = 'choosing';
    w.offer = ['rewind', 'damage', 'rapid'];
    const before = w.snake.headPos;
    w.choose(0);
    expect(w.snake.headPos).toBeCloseTo(before - w.path.length * 0.15);
  });

  it('pierce lets one bullet damage two segments', () => {
    const w = lineWorld(segs(3, 1000));
    w.stacks = { pierce: 1 };
    w.stats = computeStats(NO_RANKS, w.stacks);
    placeHead(w, 600);
    // aim along the path from the right so the bullet travels through the segments
    w.turret.x = 700;
    w.turret.y = 200;
    w.setAim(0, 200);
    w.turret.angle = w.turret.target;
    for (let i = 0; i < 26; i++) w.step();
    const ids = new Set(w.events.filter((e) => e.t === 'hit').map((e) => (e.t === 'hit' ? e.unitId : 0)));
    expect(ids.size).toBe(2);
  });

  it('explosive splashes the next segment', () => {
    const w = lineWorld(segs(3, 1000));
    w.stacks = { explosive: 1 };
    w.stats = computeStats(NO_RANKS, w.stacks);
    placeHead(w, 600);
    w.setAim(w.ballX[0], 200);
    w.turret.angle = w.turret.target;
    for (let i = 0; i < 80; i++) w.step();
    expect(w.snake.units[1].hp).toBeLessThan(1000);
    expect(1000 - w.snake.units[1].hp).toBeCloseTo((1000 - w.snake.units[0].hp) * 0.5, 5);
  });
});

describe('crits', () => {
  it('crit rate over 10,000 shots is within ±1% of crit chance, and crits deal crit damage', () => {
    const w = lineWorld(segs(1, 1e12));
    w.stats = { ...computeStats({ ...NO_RANKS, critChance: 30 }) };
    placeHead(w, 500);
    w.setAim(w.ballX[1], 200);
    w.turret.angle = w.turret.target;
    let hits = 0;
    let crits = 0;
    while (hits < 10000) {
      w.events.length = 0;
      w.step();
      for (const e of w.events) {
        if (e.t !== 'hit') continue;
        hits++;
        if (e.crit) {
          crits++;
          expect(e.dmg).toBeCloseTo(w.stats.damage * w.stats.critDamage);
        } else expect(e.dmg).toBeCloseTo(w.stats.damage);
      }
    }
    expect(Math.abs(crits / hits - 0.3)).toBeLessThan(0.01);
  });

  it('shop crit is capped at 60%', () => {
    expect(computeStats({ ...NO_RANKS, critChance: 90 }).critChance).toBeCloseTo(0.6);
  });

  it('stats combine base, shop and run', () => {
    const s = computeStats(
      { attack: 10, attackSpeed: 10, critChance: 5, critDamage: 4 },
      { damage: 1, keen: 1 },
    );
    expect(s.damage).toBeCloseTo(balance.base.attack * Math.pow(1.05, 10) * 1.2);
    expect(s.fireRate).toBeCloseTo(4 * 1.3);
    expect(s.critChance).toBeCloseTo(0.1);
    expect(s.critDamage).toBeCloseTo(1.7);
  });
});
