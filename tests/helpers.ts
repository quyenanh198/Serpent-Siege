import { NO_RANKS } from '../src/core/stats';
import { World } from '../src/core/sim';
import type { UnitSpec } from '../src/core/types';

/** A long straight path from left to right at y=200, turret below it. */
export const LINE: [number, number][] = [
  [0, 200],
  [700, 200],
];

export function segs(n: number, hp = 100): UnitSpec[] {
  return Array.from({ length: n }, (_, i) => ({
    kind: 'segment' as const,
    type: 'normal' as const,
    maxHp: hp,
    index: i,
  }));
}

export function lineWorld(recipe: UnitSpec[], speed = 0, seed = 1): World {
  return new World({ path: LINE, turret: [350, 1000], ranks: NO_RANKS, seed, recipe, speed });
}

/** Skip the intro rush by putting the head far along already. */
export function placeHead(w: World, d: number): void {
  w.snake.headPos = d;
  w.layoutBalls();
}
