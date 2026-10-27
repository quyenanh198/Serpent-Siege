import type { ShopRanks } from '../core/stats';
import type { Difficulty } from '../core/types';

export const SAVE_VERSION = 1;

export interface StageRecord {
  cleared: Difficulty[];
  bestScore: number;
  /** Failures since the last clear, per difficulty (comeback bonus). */
  fails: Partial<Record<Difficulty, number>>;
}

export interface Settings {
  sfx: number;
  music: number;
  vibration: boolean;
  shake: boolean;
}

export interface SaveData {
  version: number;
  profile: string;
  gold: number;
  shop: ShopRanks;
  stages: Record<string, StageRecord>;
  endless: { bestSegment: number };
  settings: Settings;
  /** Last local change (ms since epoch); newer copy wins when syncing. */
  updated: number;
}

export function defaultSave(profile: string): SaveData {
  return {
    version: SAVE_VERSION,
    profile,
    gold: 0,
    shop: { attack: 0, attackSpeed: 0, critChance: 0, critDamage: 0 },
    stages: {},
    endless: { bestSegment: 0 },
    settings: { sfx: 0.8, music: 0.5, vibration: true, shake: true },
    updated: 0,
  };
}

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const DIFFS: Difficulty[] = ['standard', 'hard', 'expert'];

/**
 * Validate and migrate any stored value into a SaveData. Unknown or broken fields fall back to
 * defaults; returns null only when the value is not a save at all.
 */
export function migrateSave(raw: unknown, profile: string): SaveData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.version !== 'number' || r.version > SAVE_VERSION) return null;
  const d = defaultSave(profile);
  const shop = (r.shop ?? {}) as Record<string, unknown>;
  const settings = (r.settings ?? {}) as Record<string, unknown>;
  const endless = (r.endless ?? {}) as Record<string, unknown>;
  const stages: Record<string, StageRecord> = {};
  for (const [id, v] of Object.entries((r.stages ?? {}) as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const s = v as Record<string, unknown>;
    const fails = (s.fails ?? {}) as Record<string, unknown>;
    stages[id] = {
      cleared: Array.isArray(s.cleared) ? DIFFS.filter((x) => (s.cleared as unknown[]).includes(x)) : [],
      bestScore: num(s.bestScore, 0),
      fails: Object.fromEntries(DIFFS.map((x) => [x, Math.floor(num(fails[x], 0))]).filter(([, n]) => n)),
    };
  }
  return {
    version: SAVE_VERSION,
    profile,
    gold: num(r.gold, 0),
    shop: {
      attack: Math.floor(num(shop.attack, 0)),
      attackSpeed: Math.floor(num(shop.attackSpeed, 0)),
      critChance: Math.floor(num(shop.critChance, 0)),
      critDamage: Math.floor(num(shop.critDamage, 0)),
    },
    stages,
    endless: { bestSegment: Math.floor(num(endless.bestSegment, 0)) },
    settings: {
      sfx: Math.min(1, num(settings.sfx, d.settings.sfx)),
      music: Math.min(1, num(settings.music, d.settings.music)),
      vibration: bool(settings.vibration, d.settings.vibration),
      shake: bool(settings.shake, d.settings.shake),
    },
    updated: num(r.updated, 0),
  };
}
