import balance from './data/balance.json';
import { RUN_UPGRADE_BY_ID as U, type RunStacks } from './runUpgrades';

export interface ShopRanks {
  attack: number;
  attackSpeed: number;
  critChance: number;
  critDamage: number;
}

export const NO_RANKS: ShopRanks = { attack: 0, attackSpeed: 0, critChance: 0, critDamage: 0 };

export interface ShooterStats {
  damage: number;
  fireRate: number;
  critChance: number;
  critDamage: number;
  bullets: number;
  pierce: number;
  ricochet: number;
  /** Splash fraction to the next segment. */
  splash: number;
  /** Snake slow fraction per hit. */
  frost: number;
  /** Extra segments a chain spark jumps to (0 = no chain). */
  chain: number;
  headBonus: number;
}

const pct = (v: number) => v / 100;

/** Final shooter stats = base + shop ranks + run upgrade stacks. */
export function computeStats(ranks: ShopRanks, run: RunStacks = {}): ShooterStats {
  const b = balance.base;
  const s = balance.shop;
  const n = (id: keyof typeof U) => run[id] ?? 0;
  const shopCrit = Math.min(s.critChance.maxRank ?? Infinity, ranks.critChance) * s.critChance.perRank;
  return {
    damage: b.attack * Math.pow(1 + s.attack.perRank, ranks.attack) * (1 + n('damage') * pct(U.damage.value)),
    fireRate:
      b.fireRate * (1 + ranks.attackSpeed * s.attackSpeed.perRank) * (1 + n('rapid') * pct(U.rapid.value)),
    critChance: Math.min(1, b.critChance + shopCrit + n('keen') * pct(U.keen.value)),
    critDamage: b.critDamage + ranks.critDamage * s.critDamage.perRank + n('deadly') * pct(U.deadly.value),
    bullets: 1 + n('multishot') * U.multishot.value,
    pierce: n('pierce') * U.pierce.value,
    ricochet: n('ricochet') * U.ricochet.value,
    splash: n('explosive') === 0 ? 0 : pct(U.explosive.value) * (1 + 0.5 * (n('explosive') - 1)),
    frost: n('frost') * pct(U.frost.value),
    chain: n('chain') === 0 ? 0 : U.chain.value + n('chain') - 1,
    headBonus: n('headHunter') * pct(U.headHunter.value),
  };
}
