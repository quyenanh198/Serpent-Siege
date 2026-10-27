import { describe, expect, it } from 'vitest';
import { runPacing } from '../src/meta/pacing';

describe('pacing (real-game bot, Standard)', () => {
  it('clears all 20 stages with no wall and a sane number of runs', () => {
    const rows = runPacing();
    const runs = rows.reduce((a, r) => a + r.tries, 0);
    const maxTries = Math.max(...rows.map((r) => r.tries));
    // The bot aims perfectly, so people need more tries; these bounds catch big balance regressions.
    expect(rows.every((r) => r.tries < 30)).toBe(true);
    expect(maxTries).toBeLessThanOrEqual(8);
    expect(runs).toBeGreaterThanOrEqual(30);
    expect(runs).toBeLessThanOrEqual(80);
  }, 60_000);
});
