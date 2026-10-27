import { describe, expect, it } from 'vitest';
import { lineWorld, placeHead, segs } from './helpers';

describe('shooter', () => {
  it('fires automatically at fire rate with no input', () => {
    const w = lineWorld(segs(1));
    placeHead(w, 300);
    for (let i = 0; i < 60; i++) w.step();
    expect(w.events.filter((e) => e.t === 'fire').length).toBe(4);
  });

  it('a tap changes the aim only, not the fire rate', () => {
    const a = lineWorld(segs(1));
    const b = lineWorld(segs(1));
    placeHead(a, 300);
    placeHead(b, 300);
    b.setAim(0, 1000);
    for (let i = 0; i < 120; i++) {
      a.step();
      b.step();
    }
    const fa = a.events.filter((e) => e.t === 'fire').length;
    const fb = b.events.filter((e) => e.t === 'fire').length;
    expect(fb).toBe(fa);
    expect(Math.cos(b.turret.angle)).toBeCloseTo(-1, 5);
  });

  it('turret turns 180° in about 0.1 s', () => {
    const w = lineWorld(segs(1));
    w.setAim(350, 2000);
    for (let i = 0; i < 6; i++) w.step();
    expect(Math.abs(w.turret.angle - Math.PI / 2)).toBeLessThan(0.01);
  });
});
