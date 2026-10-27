import Phaser from 'phaser';
import balance from '../core/data/balance.json';

/** All art is drawn in code at boot (see ASSETS.md). */
export const BALL_COLORS = [0xe5534b, 0xf5a742, 0x4cd07d, 0x3fa7e8, 0xa66ee8, 0x2fc9b5];
const R = balance.ball.diameter / 2;

function make(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (g: Phaser.GameObjects.Graphics) => void,
) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function shadedBall(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, base = 0xffffff) {
  g.fillStyle(0x000000, 0.25);
  g.fillCircle(cx + 1, cy + 2, r);
  g.fillStyle(base, 1);
  g.fillCircle(cx, cy, r);
  g.fillStyle(0x000000, 0.18);
  g.fillCircle(cx + r * 0.25, cy + r * 0.3, r * 0.75);
  g.fillStyle(base, 1);
  g.fillCircle(cx - r * 0.08, cy - r * 0.08, r * 0.78);
  g.fillStyle(0xffffff, 0.75);
  g.fillCircle(cx - r * 0.35, cy - r * 0.4, r * 0.25);
}

export function makeTextures(scene: Phaser.Scene): void {
  const s = R * 2 + 4;
  const c = s / 2;
  make(scene, 'ball', s, s, (g) => shadedBall(g, c, c, R));
  make(scene, 'ballArmor', s, s, (g) => {
    shadedBall(g, c, c, R, 0xb8bcc8);
    g.lineStyle(4, 0x5a5f6e, 1);
    g.strokeCircle(c, c, R - 2);
    g.fillStyle(0x5a5f6e, 1);
    for (let i = 0; i < 4; i++)
      g.fillCircle(c + Math.cos((i * Math.PI) / 2) * (R - 6), c + Math.sin((i * Math.PI) / 2) * (R - 6), 2.5);
  });
  make(scene, 'shield', s + 8, s + 8, (g) => {
    g.lineStyle(3, 0x9fe3ff, 0.95);
    g.strokeCircle((s + 8) / 2, (s + 8) / 2, R + 3);
    g.fillStyle(0x9fe3ff, 0.18);
    g.fillCircle((s + 8) / 2, (s + 8) / 2, R + 3);
  });
  make(scene, 'ballUp', s + 8, s + 8, (g) => {
    const k = (s + 8) / 2;
    shadedBall(g, k, k, R + 3, 0xffd34d);
    g.fillStyle(0xffffff, 1);
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? R * 0.7 : R * 0.3;
      pts.push(new Phaser.Math.Vector2(k + Math.cos(a) * rr, k + Math.sin(a) * rr));
    }
    g.fillPoints(pts, true);
  });
  // Head: faces right (angle 0).
  make(scene, 'head', s + 16, s + 16, (g) => {
    const k = (s + 16) / 2;
    shadedBall(g, k, k, R + 5, 0x4b8f3a);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(k + 6, k - 8, 6);
    g.fillCircle(k + 6, k + 8, 6);
    g.fillStyle(0x111111, 1);
    g.fillCircle(k + 8, k - 8, 3);
    g.fillCircle(k + 8, k + 8, 3);
    g.fillStyle(0xd13b3b, 1);
    g.fillTriangle(k + R + 4, k - 2, k + R + 14, k - 6, k + R + 14, k + 2);
  });
  make(scene, 'turret', 96, 96, (g) => {
    g.fillStyle(0x000000, 0.3);
    g.fillCircle(49, 51, 34);
    g.fillStyle(0x50466e, 1);
    g.fillCircle(48, 48, 34);
    g.fillStyle(0x7a6aa8, 1);
    g.fillCircle(48, 48, 26);
    g.fillStyle(0xd8d0f0, 1);
    g.fillRoundedRect(48, 40, 46, 16, 5);
    g.fillStyle(0xf5b942, 1);
    g.fillCircle(48, 48, 12);
  });
  make(scene, 'bullet', 16, 16, (g) => {
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 5);
  });
  make(scene, 'spark', 10, 10, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(5, 5, 5);
  });
  makeGoals(scene);
}

function makeGoals(scene: Phaser.Scene) {
  const S = 110;
  const person = (g: Phaser.GameObjects.Graphics, x: number, y: number, color: number) => {
    g.fillStyle(0xf1c27d, 1);
    g.fillCircle(x, y - 22, 11);
    g.fillStyle(color, 1);
    g.fillRoundedRect(x - 13, y - 10, 26, 34, 8);
  };
  make(scene, 'goal-hostage', S, S, (g) => {
    g.fillStyle(0x2b2540, 1);
    g.fillRoundedRect(8, 8, S - 16, S - 16, 14);
    person(g, S / 2, S / 2 + 4, 0x3fa7e8);
    g.lineStyle(5, 0x9a93b5, 1);
    for (let x = 20; x < S - 10; x += 16) g.lineBetween(x, 10, x, S - 10);
    g.lineStyle(6, 0x9a93b5, 1);
    g.strokeRoundedRect(8, 8, S - 16, S - 16, 14);
  });
  make(scene, 'goal-champion', S, S, (g) => {
    g.fillStyle(0xf5b942, 0.25);
    g.fillCircle(S / 2, S / 2, S / 2 - 4);
    person(g, S / 2, S / 2 + 10, 0xa66ee8);
    g.fillStyle(0xf5c542, 1);
    g.fillTriangle(S / 2 - 14, 30, S / 2 + 14, 30, S / 2, 14);
    g.fillRect(S / 2 - 14, 28, 28, 8);
  });
  make(scene, 'goal-castle', S, S, (g) => {
    g.fillStyle(0x8a8fa8, 1);
    g.fillRect(18, 40, S - 36, S - 50);
    for (let x = 18; x < S - 18; x += 18) g.fillRect(x, 28, 10, 14);
    g.fillStyle(0x3b2f2f, 1);
    g.fillRoundedRect(S / 2 - 12, S - 42, 24, 32, { tl: 12, tr: 12, bl: 0, br: 0 });
    g.fillStyle(0xe5534b, 1);
    g.fillTriangle(S / 2, 6, S / 2, 24, S / 2 + 18, 15);
  });
  make(scene, 'goal-village', S, S, (g) => {
    const house = (x: number, y: number, w: number, c: number) => {
      g.fillStyle(0xd9c7a3, 1);
      g.fillRect(x, y, w, w * 0.8);
      g.fillStyle(c, 1);
      g.fillTriangle(x - 6, y, x + w + 6, y, x + w / 2, y - w * 0.6);
    };
    house(12, 60, 40, 0xc0483f);
    house(58, 50, 44, 0x3f7fc0);
  });
  make(scene, 'goal-shrine', S, S, (g) => {
    g.fillStyle(0xc0483f, 1);
    g.fillRect(22, 30, 10, 70);
    g.fillRect(S - 32, 30, 10, 70);
    g.fillRect(10, 22, S - 20, 10);
    g.fillRect(18, 42, S - 36, 7);
    g.fillStyle(0xf5c542, 1);
    g.fillCircle(S / 2, 72, 12);
  });
}
