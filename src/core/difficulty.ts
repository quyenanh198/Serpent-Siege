import balance from './data/balance.json';
import hpTweaks from './data/hpTweaks.json';
import { Rng } from './rng';
import type { Difficulty, SegmentType, StageData, UnitSpec } from './types';

const BOSS_EVERY = 5;

export function isBoss(stageNumber: number): boolean {
  return stageNumber % BOSS_EVERY === 0;
}

/** Standard segment count S(n) = 36 + round(0.25 (n-1)) + 2 on boss stages (08 §4a). */
export function standardSegments(stageNumber: number): number {
  return 36 + Math.round(0.25 * (stageNumber - 1)) + (isBoss(stageNumber) ? 2 : 0);
}

export function segmentCount(stageNumber: number, difficulty: Difficulty): number {
  return Math.round(standardSegments(stageNumber) * balance.difficulty[difficulty].count);
}

/** Per-stage HP tweak that evens out map difficulty (tuned by tools/tune-stages.ts). */
export function hpTweak(stageNumber: number): number {
  return (hpTweaks as Record<string, number>)[String(stageNumber)] ?? 1;
}

/** Average segment HP B for a stage and difficulty. */
export function stageHp(stageNumber: number, difficulty: Difficulty): number {
  const s = balance.snake;
  return (
    s.hpBase *
    Math.pow(s.hpGrowth, stageNumber - 1) *
    hpTweak(stageNumber) *
    balance.difficulty[difficulty].hp
  );
}

/** HP(i) = B × front × (tail/front)^(i/(S-1)) (08 §4b). */
export function segmentHp(b: number, i: number, count: number, front: number, tail: number): number {
  const t = count > 1 ? i / (count - 1) : 0;
  return b * front * Math.pow(tail / front, t);
}

export function stageSpeed(stage: StageData, difficulty: Difficulty): number {
  return stage.snake.speed * balance.difficulty[difficulty].speed;
}

/**
 * Upgrade ball positions: the first right after segment `first` (1-based count),
 * then every 3–5 segments. Returns the number of segments that come before each ball.
 */
export function upgradeSlots(count: number, first: number, every: [number, number], rng: Rng): number[] {
  const slots: number[] = [];
  let at = first;
  while (at < count) {
    slots.push(at);
    at += rng.int(every[0], every[1]);
  }
  return slots;
}

function pickType(rng: Rng, shares: Partial<Record<SegmentType, number>>, extra: number): SegmentType {
  const entries = Object.entries(shares) as [SegmentType, number][];
  if (entries.length === 0) return 'normal';
  const total = entries.reduce((a, [, v]) => a + v, 0);
  const special = Math.min(0.6, total + (total > 0 ? extra : 0));
  if (rng.next() >= special) return 'normal';
  let r = rng.next() * total;
  for (const [type, v] of entries) {
    r -= v;
    if (r <= 0) return type;
  }
  return entries[entries.length - 1][0];
}

/** Build the front-to-tail unit list for a stage at a difficulty. */
export function buildStageRecipe(stage: StageData, difficulty: Difficulty, seed: number): UnitSpec[] {
  const rng = new Rng(seed);
  const count = segmentCount(stage.number, difficulty);
  const b = stageHp(stage.number, difficulty);
  const extra = balance.difficulty[difficulty].special;
  const slots = new Set(upgradeSlots(count, stage.snake.firstUpgradeAfter, stage.snake.upgradeEvery, rng));
  const out: UnitSpec[] = [];
  for (let i = 0; i < count; i++) {
    // The first two segments are always normal so the opening is readable.
    const type = i < 2 ? 'normal' : pickType(rng, stage.snake.types, extra);
    const maxHp = segmentHp(b, i, count, stage.snake.hpFrontMult, stage.snake.hpTailMult);
    out.push({ kind: 'segment', type, maxHp, index: i });
    if (slots.has(i + 1)) {
      out.push({ kind: 'upgrade', type: 'normal', maxHp: maxHp * balance.snake.upgradeHpMult, index: i });
    }
  }
  return out;
}

/** Endless: HP keeps rising per segment spawned; no tail. */
export function endlessSegmentHp(index: number): number {
  return balance.endless.hpBase * Math.pow(balance.endless.hpGrowth, index);
}

export function endlessSpeed(progress: number): number {
  const e = balance.endless;
  return Math.min(e.speedMax, e.speed * Math.pow(e.speedGrowth, Math.floor(progress / e.speedGrowthEvery)));
}

/** Segment index an endless run starts at: floor(0.2 × best). */
export function endlessStart(best: number): number {
  return Math.floor(balance.endless.startFraction * best);
}

/**
 * Endless upgrade balls follow the same rhythm as stages (after segment 2, then every 3–5),
 * generated lazily from a seeded RNG.
 */
export class EndlessRecipe {
  private readonly rng: Rng;
  private readonly typeRng: Rng;
  private nextUpgradeAfter = 2;
  constructor(seed: number) {
    this.rng = new Rng(seed);
    this.typeRng = new Rng(seed ^ 0x9e3779b9);
  }
  /** Units for segment index i (the segment, plus an upgrade ball after it when due). */
  unitsFor(i: number): UnitSpec[] {
    let type: SegmentType = 'normal';
    if (i >= 2 && this.typeRng.next() < balance.endless.special) {
      type = this.typeRng.next() < 0.5 ? 'armored' : 'shielded';
    }
    const maxHp = endlessSegmentHp(i);
    const out: UnitSpec[] = [{ kind: 'segment', type, maxHp, index: i }];
    if (i + 1 === this.nextUpgradeAfter) {
      out.push({ kind: 'upgrade', type: 'normal', maxHp: maxHp * balance.snake.upgradeHpMult, index: i });
      this.nextUpgradeAfter += this.rng.int(3, 5);
    }
    return out;
  }
}
