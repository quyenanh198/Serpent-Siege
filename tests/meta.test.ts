import { describe, expect, it } from 'vitest';
import balance from '../src/core/data/balance.json';
import { runGold } from '../src/meta/gold';
import { applyEndlessRun, applyStageRun, isUnlocked } from '../src/meta/progress';
import { defaultSave, migrateSave } from '../src/meta/save';
import { buyRank, rankCost } from '../src/meta/shop';
import { STAGES } from '../src/core/stages';

const k = balance.gold.perSegmentHp;

describe('gold', () => {
  it('failed run pays segment HP × k for destroyed segments', () => {
    expect(
      runGold({ destroyedHp: [100, 200], cleared: false, firstClear: false, fails: 0 }).total,
    ).toBeCloseTo(300 * k);
  });
  it('clear pays x2', () => {
    expect(
      runGold({ destroyedHp: [100, 200], cleared: true, firstClear: false, fails: 0 }).total,
    ).toBeCloseTo(600 * k);
  });
  it('first clear adds half a cleared run', () => {
    expect(runGold({ destroyedHp: [100, 200], cleared: true, firstClear: true, fails: 0 }).total).toBeCloseTo(
      900 * k,
    );
  });
  it('comeback +10% per fail, max +50%', () => {
    expect(runGold({ destroyedHp: [1000], cleared: false, firstClear: false, fails: 2 }).total).toBeCloseTo(
      1200 * k,
    );
    expect(runGold({ destroyedHp: [1000], cleared: false, firstClear: false, fails: 9 }).total).toBeCloseTo(
      1500 * k,
    );
  });
  it('first-clear bonus is paid only once per stage + difficulty; fails reset on clear', () => {
    let save = defaultSave('ken');
    const run = { stageId: 'w1-01', difficulty: 'standard' as const, destroyedHp: [1000], score: 1 };
    let r = applyStageRun(save, { ...run, cleared: false });
    expect(r.save.stages['w1-01'].fails.standard).toBe(1);
    r = applyStageRun(r.save, { ...run, cleared: true });
    expect(r.gold.firstClearBonus).toBeGreaterThan(0);
    expect(r.gold.comebackBonus).toBeGreaterThan(0);
    expect(r.save.stages['w1-01'].fails.standard).toBe(0);
    save = r.save;
    r = applyStageRun(save, { ...run, cleared: true });
    expect(r.gold.firstClearBonus).toBe(0);
    r = applyStageRun(save, { ...run, difficulty: 'hard', cleared: true });
    expect(r.gold.firstClearBonus).toBeGreaterThan(0);
  });
  it('endless pays per segment and records the best', () => {
    const r = applyEndlessRun(defaultSave('ken'), { destroyedHp: [500, 500], progress: 12 });
    expect(r.gold.total).toBeCloseTo(1000 * k);
    expect(r.save.endless.bestSegment).toBe(12);
    expect(r.newBest).toBe(true);
    expect(applyEndlessRun(r.save, { destroyedHp: [], progress: 5 }).save.endless.bestSegment).toBe(12);
  });
});

describe('shop', () => {
  it('cost = base × 1.05^rank, rounded up', () => {
    expect(rankCost('attack', 0)).toBe(10);
    expect(rankCost('attack', 10)).toBe(Math.ceil(10 * Math.pow(1.05, 10)));
    expect(rankCost('critChance', 0)).toBe(15);
  });
  it('buying spends gold and adds a rank', () => {
    const r = buyRank({ ...defaultSave('a'), gold: 25 }, 'attack');
    expect(r.ok && r.save.gold).toBe(15);
    expect(r.ok && r.save.shop.attack).toBe(1);
  });
  it('not enough gold is refused', () => {
    expect(buyRank({ ...defaultSave('a'), gold: 9 }, 'attack')).toEqual({ ok: false, reason: 'gold' });
  });
  it('crit % stops at 60 ranks', () => {
    const s = defaultSave('a');
    expect(buyRank({ ...s, gold: 1e9, shop: { ...s.shop, critChance: 60 } }, 'critChance')).toEqual({
      ok: false,
      reason: 'maxed',
    });
  });
});

describe('save', () => {
  it('round-trips through JSON', () => {
    const s = {
      ...defaultSave('ken'),
      gold: 12.5,
      stages: { 'w1-01': { cleared: ['standard' as const], bestScore: 3, fails: {} } },
    };
    expect(migrateSave(JSON.parse(JSON.stringify(s)), 'ken')).toEqual(s);
  });
  it('broken fields fall back to defaults; non-saves are rejected', () => {
    const m = migrateSave({ version: 1, gold: -5, shop: { attack: 'x' }, settings: { sfx: 9 } }, 'ken')!;
    expect(m.gold).toBe(0);
    expect(m.shop.attack).toBe(0);
    expect(m.settings.sfx).toBe(1);
    expect(migrateSave('garbage', 'ken')).toBeNull();
    expect(migrateSave({ version: 99 }, 'ken')).toBeNull();
  });
});

describe('unlocks', () => {
  it('Standard unlocks the next stage and Hard; Hard unlocks Expert', () => {
    let s = defaultSave('ken');
    expect(isUnlocked(s, 0, 'standard')).toBe(true);
    expect(isUnlocked(s, 1, 'standard')).toBe(false);
    expect(isUnlocked(s, 0, 'hard')).toBe(false);
    s = applyStageRun(s, {
      stageId: STAGES[0].id,
      difficulty: 'standard',
      cleared: true,
      destroyedHp: [],
      score: 0,
    }).save;
    expect(isUnlocked(s, 1, 'standard')).toBe(true);
    expect(isUnlocked(s, 0, 'hard')).toBe(true);
    expect(isUnlocked(s, 0, 'expert')).toBe(false);
    s = applyStageRun(s, {
      stageId: STAGES[0].id,
      difficulty: 'hard',
      cleared: true,
      destroyedHp: [],
      score: 0,
    }).save;
    expect(isUnlocked(s, 0, 'expert')).toBe(true);
  });
});
