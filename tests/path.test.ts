import { describe, expect, it } from 'vitest';
import { Path } from '../src/core/path';

describe('path', () => {
  it('pointAt is evenly spaced along a curve within 1 px', () => {
    const p = new Path([
      [100, 100],
      [600, 120],
      [620, 600],
      [120, 650],
      [200, 300],
    ]);
    const step = 30;
    let prev = p.pointAt(0);
    for (let d = step; d < p.length; d += step) {
      const cur = p.pointAt(d);
      const chord = Math.hypot(cur.x - prev.x, cur.y - prev.y);
      expect(Math.abs(chord - step)).toBeLessThan(1);
      prev = cur;
    }
  });

  it('straight path length and endpoints are exact', () => {
    const p = new Path([
      [0, 0],
      [300, 0],
    ]);
    expect(p.length).toBeCloseTo(300, 3);
    expect(p.pointAt(150).x).toBeCloseTo(150, 3);
    expect(p.pointAt(-5).x).toBe(0);
    expect(p.pointAt(999).x).toBe(300);
  });
});
