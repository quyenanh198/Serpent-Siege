import table from './data/runUpgrades.json';
import type { Rng } from './rng';

export type RunUpgradeId =
  | 'damage'
  | 'rapid'
  | 'multishot'
  | 'pierce'
  | 'ricochet'
  | 'explosive'
  | 'frost'
  | 'keen'
  | 'deadly'
  | 'chain'
  | 'rewind'
  | 'headHunter';

export interface RunUpgradeDef {
  id: RunUpgradeId;
  name: string;
  desc: string;
  value: number;
  max: number;
}

export const RUN_UPGRADES = table as RunUpgradeDef[];
export const RUN_UPGRADE_BY_ID = Object.fromEntries(RUN_UPGRADES.map((u) => [u.id, u])) as Record<
  RunUpgradeId,
  RunUpgradeDef
>;

export type RunStacks = Partial<Record<RunUpgradeId, number>>;

/** Card text, built from the table. Chain spark grows by 1 segment per extra stack. */
export function describe(id: RunUpgradeId): string {
  const u = RUN_UPGRADE_BY_ID[id];
  return u.desc.replace('{v}', String(u.value));
}

/** 3 distinct upgrades that are not yet at max stacks (fewer if fewer remain). */
export function offerUpgrades(stacks: RunStacks, rng: Rng, count = 3): RunUpgradeId[] {
  const pool = RUN_UPGRADES.filter((u) => (stacks[u.id] ?? 0) < u.max).map((u) => u.id);
  const out: RunUpgradeId[] = [];
  while (out.length < count && pool.length > 0) {
    out.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
  }
  return out;
}
