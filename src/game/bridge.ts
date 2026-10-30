import Phaser from 'phaser';
import { Path } from '../core/path';

type P = { x: number; y: number };
const HALF = 37;
const STEP = 18;

function edge(path: Path, distance: number, offset: number): P {
  const p = path.pointAt(distance);
  const before = path.pointAt(Math.max(0, distance - 4));
  const after = path.pointAt(Math.min(path.length, distance + 4));
  const dx = after.x - before.x;
  const dy = after.y - before.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: p.x - (dy / length) * offset, y: p.y + (dx / length) * offset };
}

function quad(g: Phaser.GameObjects.Graphics, a: P, b: P, c: P, d: P, color: number) {
  g.fillStyle(color, 1);
  g.fillPoints([a, b, c, d], true);
}

function band(
  g: Phaser.GameObjects.Graphics,
  path: Path,
  start: number,
  end: number,
  left: number,
  right: number,
  color: number,
) {
  quad(
    g,
    edge(path, start, left),
    edge(path, end, left),
    edge(path, end, right),
    edge(path, start, right),
    color,
  );
}

/** Narrow carved-stone bridge; its center follows the same Path as the snake. */
export function drawBridge(scene: Phaser.Scene, path: Path): void {
  const shadow = scene.add.graphics().setDepth(-2);
  const bridge = scene.add.graphics().setDepth(-1);
  const marks = scene.add.graphics().setDepth(0);
  const count = Math.ceil(path.length / STEP);

  for (let i = 0; i < count; i++) {
    const d0 = i * STEP;
    const d1 = Math.min(path.length, d0 + STEP + 0.5);
    const near0 = edge(path, d0, HALF + 3);
    const near1 = edge(path, d1, HALF + 3);
    const far0 = edge(path, d0, -(HALF + 3));
    const far1 = edge(path, d1, -(HALF + 3));
    quad(
      shadow,
      { x: near0.x + 3, y: near0.y + 14 },
      { x: near1.x + 3, y: near1.y + 14 },
      { x: far1.x + 3, y: far1.y + 14 },
      { x: far0.x + 3, y: far0.y + 14 },
      0x20372d,
    );
    band(bridge, path, d0, d1, HALF + 3, -(HALF + 3), 0x695b3d);
    band(bridge, path, d0, d1, HALF, -HALF, 0xb89355);
    band(bridge, path, d0, d1, HALF - 6, -(HALF - 6), 0x604e31);

    // Three staggered courses of small stones, never one full-width plank.
    const rows: [number, number][] = [
      [HALF - 9, 11],
      [9, -9],
      [-11, -(HALF - 9)],
    ];
    for (let row = 0; row < rows.length; row++) {
      const [left, right] = rows[row];
      const joint = row === 1 ? 5 : 2;
      const color = [0xd5b777, 0xc9aa6a, 0xe0c489, 0xbfa06a][(i * 3 + row) % 4];
      if (d1 - d0 > joint + 2) band(bridge, path, d0 + joint, d1 - 1, left, right, color);
      if ((i + row) % 7 === 0) {
        const p = edge(path, Math.min(path.length, d0 + 10), (left + right) / 2);
        marks.fillStyle(0x64804b, 0.45);
        marks.fillCircle(p.x, p.y, 2.5);
      }
    }

    // Small carved square motifs along the raised edge.
    if (i % 2 === 0) {
      for (const side of [-1, 1]) {
        const p = edge(path, Math.min(path.length, d0 + 9), side * (HALF - 3));
        marks.lineStyle(1.3, 0x6b532e, 0.8);
        marks.strokeRect(p.x - 3, p.y - 3, 6, 6);
        marks.fillStyle(0xf0d697, 0.7);
        marks.fillCircle(p.x, p.y, 1);
      }
    }
  }
}
