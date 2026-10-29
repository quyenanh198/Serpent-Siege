import Phaser from 'phaser';
import { Path } from '../core/path';

const TILE = 25;
const HALF = 51;
type P = { x: number; y: number };

function sides(path: Path, distance: number, half: number): [P, P] {
  const p = path.pointAt(distance);
  const before = path.pointAt(Math.max(0, distance - 5));
  const after = path.pointAt(Math.min(path.length, distance + 5));
  const dx = after.x - before.x;
  const dy = after.y - before.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  return [
    { x: p.x + nx * half, y: p.y + ny * half },
    { x: p.x - nx * half, y: p.y - ny * half },
  ];
}

function quad(g: Phaser.GameObjects.Graphics, a: P, b: P, c: P, d: P, color: number) {
  g.fillStyle(color, 1);
  g.fillPoints([a, b, c, d], true);
}

function across(left: P, right: P, fraction: number): P {
  return { x: left.x + (right.x - left.x) * fraction, y: left.y + (right.y - left.y) * fraction };
}

/** Draw individual raised stone slabs on the exact Path used by the simulation. */
export function drawBridge(scene: Phaser.Scene, path: Path): void {
  const wall = scene.add.graphics().setDepth(-1);
  const deck = scene.add.graphics().setDepth(0);
  const count = Math.ceil(path.length / TILE);
  // Drop shadow and the hanging face make the route read as terrain, not a line overlay.
  for (let i = 0; i < count; i++) {
    const a = sides(path, i * TILE, HALF + 5);
    const b = sides(path, Math.min(path.length, (i + 1) * TILE), HALF + 5);
    quad(
      wall,
      { x: a[0].x, y: a[0].y + 17 },
      { x: b[0].x, y: b[0].y + 17 },
      { x: b[1].x, y: b[1].y + 17 },
      { x: a[1].x, y: a[1].y + 17 },
      0x152a20,
    );
  }
  for (let i = 0; i < count; i++) {
    const d0 = i * TILE;
    const d1 = Math.min(path.length, (i + 1) * TILE);
    const a = sides(path, d0, HALF);
    const b = sides(path, d1, HALF);
    const stone = [0xd7be83, 0xc8aa72, 0xe1c990, 0xcab27b][i % 4];
    quad(deck, a[0], b[0], b[1], a[1], stone);
    deck.lineStyle(2, 0x705e39, 0.75);
    deck.strokePoints([a[0], b[0], b[1], a[1]], true);
    // Uneven worn joints and short cracks give each slab its own stone face.
    const acrossA = across(a[0], a[1], 0.25 + ((i * 7) % 5) * 0.1);
    const acrossB = across(b[0], b[1], 0.25 + ((i * 11) % 5) * 0.1);
    const mid = path.pointAt(d0 + (d1 - d0) * 0.43);
    deck.lineStyle(1.5, 0x715c36, 0.36);
    deck.lineBetween(acrossA.x, acrossA.y, mid.x, mid.y);
    if (i % 3 === 0) deck.lineBetween(mid.x, mid.y, acrossB.x, acrossB.y);
    const fleck = across(a[0], a[1], 0.2 + ((i * 13) % 6) * 0.1);
    deck.fillStyle(i % 4 === 0 ? 0x668252 : 0xf2dda7, 0.28);
    deck.fillCircle(fleck.x, fleck.y, i % 5 === 0 ? 4 : 2);
    for (const side of [1, -1]) {
      const index = side > 0 ? 0 : 1;
      const outerA = sides(path, d0, HALF)[index];
      const outerB = sides(path, d1, HALF)[index];
      const innerA = sides(path, d0, HALF - 9)[index];
      const innerB = sides(path, d1, HALF - 9)[index];
      quad(deck, outerA, outerB, innerB, innerA, i % 3 === 0 ? 0x9c7a42 : 0xad894d);
      deck.lineStyle(2, 0xf3d68b, 0.85);
      deck.lineBetween(innerA.x, innerA.y, innerB.x, innerB.y);
      if (i % 5 === 0) {
        const moss = across(outerA, innerA, 0.45);
        deck.fillStyle(0x536b3b, 0.65);
        deck.fillCircle(moss.x, moss.y, 3 + (i % 3));
      }
    }
    if (i % 6 === 0) {
      const p = path.pointAt((d0 + d1) / 2);
      deck.lineStyle(2, 0x8d7041, 0.8);
      deck.strokeCircle(p.x, p.y, 9);
      deck.fillStyle(0xf3d88d, 0.8);
      deck.fillCircle(p.x, p.y, 3);
    }
  }
}
