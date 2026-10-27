import type { UnitSpec } from './types';

export interface Unit extends UnitSpec {
  id: number;
  hp: number;
  balls: number;
  shielded: boolean;
  /** Visual offset (px) while a gap closes; eases to 0. Not used for rules. */
  offset: number;
  offsetSpeed: number;
}

/**
 * A contiguous chain of units along the path. `headPos` is the arc distance of the
 * first ball of the front unit; every other ball sits one diameter behind the previous one.
 */
export class Snake {
  units: Unit[] = [];
  headPos = 0;
  private nextId = 1;

  constructor(readonly ballD: number) {}

  push(spec: UnitSpec): Unit {
    const u: Unit = {
      ...spec,
      id: this.nextId++,
      hp: spec.maxHp,
      balls: spec.kind === 'segment' ? 4 : 1,
      shielded: spec.type === 'shielded',
      offset: 0,
      offsetSpeed: 0,
    };
    this.units.push(u);
    return u;
  }

  /** Base (rule) distance of the first ball of unit i. */
  basePos(i: number): number {
    let d = this.headPos;
    for (let j = 0; j < i; j++) d -= this.units[j].balls * this.ballD;
    return d;
  }

  /** Base distance of the last ball of the tail. */
  tailPos(): number {
    return this.basePos(this.units.length) + this.ballD;
  }

  advance(dist: number): void {
    this.headPos += dist;
  }

  /**
   * Remove unit i and close the gap g: the part ahead moves back 2/3 g, the part behind moves
   * forward 1/3 g. Rules see the closed chain at once; offsets animate it over closeTime.
   */
  pop(i: number, closeTime: number): Unit {
    const [u] = this.units.splice(i, 1);
    const g = u.balls * this.ballD;
    this.headPos -= (2 / 3) * g;
    for (let j = 0; j < this.units.length; j++) {
      const v = this.units[j];
      v.offset += j < i ? (2 / 3) * g : -(1 / 3) * g;
      v.offsetSpeed = Math.abs(v.offset) / closeTime;
    }
    return u;
  }

  stepOffsets(dt: number): void {
    for (const u of this.units) {
      if (u.offset === 0) continue;
      const step = u.offsetSpeed * dt;
      if (Math.abs(u.offset) <= step) u.offset = 0;
      else u.offset -= Math.sign(u.offset) * step;
    }
  }

  /** Index of the head unit: the first segment (upgrade balls are never the head). */
  headIndex(): number {
    return this.units.findIndex((u) => u.kind === 'segment');
  }

  segmentsLeft(): number {
    let n = 0;
    for (const u of this.units) if (u.kind === 'segment') n++;
    return n;
  }
}
