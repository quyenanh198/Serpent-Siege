import Phaser from 'phaser';
import { Path } from '../core/path';

const STEP = 9;
const FRAMES = 24;

/** Place illustrated stone bridge sections along the exact simulation path. */
export function drawBridge(scene: Phaser.Scene, path: Path): void {
  for (let distance = 0, index = 0; distance < path.length; distance += STEP, index++) {
    const end = Math.min(path.length, distance + STEP);
    const middle = (distance + end) / 2;
    const p = path.pointAt(middle);
    const before = path.pointAt(Math.max(0, middle - 5));
    const after = path.pointAt(Math.min(path.length, middle + 5));
    scene.add
      .image(p.x, p.y, 'bridge-stones', Math.floor(index / 2) % FRAMES)
      .setDisplaySize(16, 74)
      .setRotation(Math.atan2(after.y - before.y, after.x - before.x))
      .setDepth(-1);
  }
}
