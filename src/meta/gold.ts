import balance from '../core/data/balance.json';

export interface GoldInput {
  /** Max HP of every segment destroyed this run (upgrade balls excluded). */
  destroyedHp: number[];
  cleared: boolean;
  /** First clear of this stage + difficulty. */
  firstClear: boolean;
  /** Failures on this stage + difficulty since the last clear. */
  fails: number;
}

export interface GoldResult {
  base: number;
  clearBonus: number;
  firstClearBonus: number;
  comebackBonus: number;
  total: number;
}

/** Gold after a stage or endless run (02 §6, 08 §4). Endless runs pass cleared=false, firstClear=false, fails=0. */
export function runGold(input: GoldInput): GoldResult {
  const g = balance.gold;
  const base = input.destroyedHp.reduce((a, h) => a + h, 0) * g.perSegmentHp;
  const clearBonus = input.cleared ? base * (g.clearMult - 1) : 0;
  const firstClearBonus = input.cleared && input.firstClear ? g.firstClearRuns * (base + clearBonus) : 0;
  const sub = base + clearBonus + firstClearBonus;
  const comebackBonus = sub * Math.min(g.comebackPerFail * input.fails, g.comebackMax);
  return { base, clearBonus, firstClearBonus, comebackBonus, total: sub + comebackBonus };
}
