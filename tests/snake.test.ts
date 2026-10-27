import { describe, expect, it } from 'vitest';
import balance from '../src/core/data/balance.json';
import type { UnitSpec } from '../src/core/types';
import { lineWorld, placeHead, segs } from './helpers';

const D = balance.ball.diameter;

describe('snake', () => {
  it('balls are spaced one diameter apart and segments have 4 balls', () => {
    const w = lineWorld(segs(3));
    placeHead(w, 500);
    expect(w.ballCount).toBe(12);
    for (let k = 1; k < w.ballCount; k++) {
      expect(w.ballX[k - 1] - w.ballX[k]).toBeCloseTo(D, 5);
    }
    expect(w.ballUnit[3]).toBe(0);
    expect(w.ballUnit[4]).toBe(1);
  });

  it('balls before the path start are hidden and cannot be hit', () => {
    const w = lineWorld(segs(3));
    placeHead(w, D * 2);
    expect(w.ballCount).toBe(3);
  });

  it('loses when the front ball reaches the path end', () => {
    const w = lineWorld(segs(3), 60);
    placeHead(w, 700 - 1);
    w.turret.target = w.turret.angle = Math.PI / 2; // shoot away
    w.step();
    expect(w.state).toBe('lost');
    expect(w.events.some((e) => e.t === 'lost')).toBe(true);
  });

  it('wins when no segments are left (upgrade balls do not count)', () => {
    const recipe: UnitSpec[] = [...segs(1, 1), { kind: 'upgrade', type: 'normal', maxHp: 1000, index: 0 }];
    const w = lineWorld(recipe);
    placeHead(w, 400);
    w.snake.units[0].hp = 0;
    // Trigger resolve via a direct hit on the remaining segment
    w.setAim(400, 200);
    for (let i = 0; i < 120 && w.state === 'playing'; i++) w.step();
    expect(w.state).toBe('won');
  });

  it('head is the 1st ball; after the head segment pops the next segment becomes head, never an upgrade ball', () => {
    const recipe: UnitSpec[] = [
      { kind: 'segment', type: 'normal', maxHp: 1, index: 0 },
      { kind: 'upgrade', type: 'normal', maxHp: 1000, index: 0 },
      { kind: 'segment', type: 'normal', maxHp: 1000, index: 1 },
    ];
    const w = lineWorld(recipe);
    placeHead(w, 600);
    expect(w.snake.headIndex()).toBe(0);
    const firstId = w.snake.units[0].id;
    w.snake.pop(0, 0.3);
    expect(w.snake.units[0].kind).toBe('upgrade');
    expect(w.snake.headIndex()).toBe(1);
    expect(w.snake.units[w.snake.headIndex()].id).not.toBe(firstId);
  });

  it('gap closing: part ahead moves back 2/3 g, part behind forward 1/3 g', () => {
    const w = lineWorld(segs(5));
    placeHead(w, 600);
    const before = [0, 1, 2, 3, 4].map((i) => w.snake.basePos(i));
    const g = 4 * D;
    w.snake.pop(2, 0.3);
    // rules see the closed chain at once
    expect(w.snake.basePos(0)).toBeCloseTo(before[0] - (2 / 3) * g, 5);
    expect(w.snake.basePos(1)).toBeCloseTo(before[1] - (2 / 3) * g, 5);
    expect(w.snake.basePos(2)).toBeCloseTo(before[3] + (1 / 3) * g, 5);
    expect(w.snake.basePos(3)).toBeCloseTo(before[4] + (1 / 3) * g, 5);
    // visuals start where they were and settle after the close time
    expect(w.snake.basePos(0) + w.snake.units[0].offset).toBeCloseTo(before[0], 5);
    for (let i = 0; i < 30; i++) w.step();
    for (const u of w.snake.units) expect(Math.abs(u.offset)).toBeLessThan(0.5);
  });

  it('hitting any of the 4 balls damages the shared segment HP; at 0 all 4 pop', () => {
    const w = lineWorld(segs(2, 25));
    placeHead(w, 600);
    // aim at the 3rd ball of the front segment
    const x = w.ballX[2];
    w.setAim(x, 200);
    w.turret.angle = w.turret.target;
    const id = w.snake.units[0].id;
    for (let i = 0; i < 200 && w.snake.units[0].id === id; i++) w.step();
    const pop = w.events.find((e) => e.t === 'pop');
    expect(pop && pop.t === 'pop' && pop.unit.id).toBe(id);
    const hits = w.events.filter((e) => e.t === 'hit' && e.unitId === id);
    expect(hits.length).toBe(3); // 10 damage per shot vs 25 HP
    expect(w.snake.units.length).toBe(1);
  });
});
