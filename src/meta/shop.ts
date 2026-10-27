import balance from '../core/data/balance.json';
import type { ShopRanks } from '../core/stats';
import type { SaveData } from './save';

export type ShopStat = keyof ShopRanks;
export const SHOP_STATS: ShopStat[] = ['attack', 'attackSpeed', 'critChance', 'critDamage'];

export const SHOP_INFO: Record<ShopStat, { name: string; effect: (rank: number) => string }> = {
  attack: { name: 'Attack', effect: (r) => `x${Math.pow(1.05, r).toFixed(2)} damage` },
  attackSpeed: { name: 'Attack speed', effect: (r) => `+${r * 3}% fire rate` },
  critChance: { name: 'Crit %', effect: (r) => `${Math.min(r, 60)}% crit chance` },
  critDamage: { name: 'Crit damage', effect: (r) => `${150 + r * 5}% crit damage` },
};

export function rankCost(stat: ShopStat, rank: number): number {
  const s = balance.shop[stat];
  return Math.ceil(s.costBase * Math.pow(s.costGrowth, rank));
}

export function isMaxed(stat: ShopStat, rank: number): boolean {
  const max = balance.shop[stat].maxRank;
  return max !== null && rank >= max;
}

export type BuyResult = { ok: true; save: SaveData } | { ok: false; reason: 'maxed' | 'gold' };

/** Buy one rank. Returns a new save; the input is not changed. */
export function buyRank(save: SaveData, stat: ShopStat): BuyResult {
  const rank = save.shop[stat];
  if (isMaxed(stat, rank)) return { ok: false, reason: 'maxed' };
  const cost = rankCost(stat, rank);
  if (save.gold < cost) return { ok: false, reason: 'gold' };
  return { ok: true, save: { ...save, gold: save.gold - cost, shop: { ...save.shop, [stat]: rank + 1 } } };
}
