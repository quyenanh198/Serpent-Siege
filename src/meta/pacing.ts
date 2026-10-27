import { playStage } from '../core/bot';
import { STAGES } from '../core/stages';
import { computeStats } from '../core/stats';
import { applyStageRun } from './progress';
import { defaultSave, type SaveData } from './save';
import { buyRank, isMaxed, rankCost, SHOP_STATS, type ShopStat } from './shop';
import { buildStageRecipe } from '../core/difficulty';

/** Expected DPS used to pick the best-value shop rank. */
function dps(save: SaveData): number {
  const s = computeStats(save.shop);
  return s.damage * s.fireRate * (1 + s.critChance * (s.critDamage - 1));
}

/** Buy the rank with the best DPS gain per gold until nothing is affordable. */
export function spendGold(save: SaveData): SaveData {
  for (;;) {
    const base = dps(save);
    let best: ShopStat | null = null;
    let bestValue = 0;
    for (const stat of SHOP_STATS) {
      if (isMaxed(stat, save.shop[stat])) continue;
      const cost = rankCost(stat, save.shop[stat]);
      if (cost > save.gold) continue;
      const trial = { ...save, shop: { ...save.shop, [stat]: save.shop[stat] + 1 } };
      const value = (dps(trial) - base) / cost;
      if (value > bestValue) {
        best = stat;
        bestValue = value;
      }
    }
    if (!best) return save;
    const r = buyRank(save, best);
    if (!r.ok) return save;
    save = r.save;
  }
}

export interface PacingRow {
  stage: number;
  tries: number;
  minutes: number;
  ranks: SaveData['shop'];
}

/** A player who always pushes the newest Standard stage with the real-game bot. */
export function runPacing(stages = STAGES.length, menuSeconds = 20, maxTries = 30): PacingRow[] {
  let save = defaultSave('bot');
  let seconds = 0;
  let seed = 1;
  const rows: PacingRow[] = [];
  for (let n = 0; n < stages; n++) {
    const stage = STAGES[n];
    let tries = 0;
    for (;;) {
      tries++;
      seed++;
      const r = playStage(stage, 'standard', save.shop, seed);
      seconds += r.time + menuSeconds;
      const recipe = buildStageRecipe(stage, 'standard', seed).filter((u) => u.kind === 'segment');
      const destroyedHp = recipe.slice(0, r.destroyed).map((u) => u.maxHp);
      save = applyStageRun(save, {
        stageId: stage.id,
        difficulty: 'standard',
        cleared: r.won,
        destroyedHp,
        score: r.destroyed,
      }).save;
      save = spendGold(save);
      if (r.won || tries >= maxTries) break;
    }
    rows.push({ stage: n + 1, tries, minutes: Math.round(seconds / 60), ranks: { ...save.shop } });
  }
  return rows;
}
