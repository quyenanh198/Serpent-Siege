import { describe, expect, it } from 'vitest';
import { Path } from '../src/core/path';
import { ENDLESS, STAGES } from '../src/core/stages';
import { landscapePath, landscapeTurret, PLAY_H, PLAY_W } from '../src/game/landscape';

describe('landscape gameplay board', () => {
  it('keeps every stage and endless bridge inside the visible canvas', () => {
    for (const stage of [...STAGES, ENDLESS]) {
      const path = new Path(landscapePath(stage.path, 'id' in stage ? stage.id : undefined));
      for (const point of path.samples(6)) {
        expect(point.x, stage.id).toBeGreaterThanOrEqual(45);
        expect(point.x, stage.id).toBeLessThanOrEqual(PLAY_W - 45);
        expect(point.y, stage.id).toBeGreaterThanOrEqual(45);
        expect(point.y, stage.id).toBeLessThanOrEqual(PLAY_H - 45);
      }
      const [x, y] = landscapeTurret(stage.turretLayout);
      expect(x).toBeGreaterThan(45);
      expect(x).toBeLessThan(PLAY_W - 45);
      expect(y).toBeGreaterThan(45);
      expect(y).toBeLessThan(PLAY_H - 45);
    }
  });
});
