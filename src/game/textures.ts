import Phaser from 'phaser';
import balance from '../core/data/balance.json';

/** Colored scales are generated in code; character art is loaded by BootScene. */
export const BALL_COLORS = [0xee7359, 0xf5bd50, 0x55cf87, 0x49badd, 0xb686e8, 0x42cbb4];
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

function shadedBall(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  r: number,
  base: number,
  armor = false,
) {
  const bright = Phaser.Display.Color.ValueToColor(base).brighten(32).color;
  const dark = Phaser.Display.Color.ValueToColor(base).darken(28).color;
  g.fillStyle(0x061814, 0.5);
  g.fillCircle(cx + 2, cy + 3, r + 1);
  g.fillStyle(0x194d3f, 1);
  g.fillCircle(cx, cy, r);
  g.fillStyle(base, 1);
  g.fillCircle(cx, cy, r - 2);
  g.fillStyle(dark, 0.8);
  g.fillEllipse(cx + 2, cy + r * 0.3, r * 1.55, r * 0.85);
  g.fillStyle(bright, 0.9);
  g.fillEllipse(cx - r * 0.24, cy - r * 0.32, r * 1.05, r * 0.62);
  g.lineStyle(2, armor ? 0xe7cc82 : 0x195343, 0.9);
  g.strokeCircle(cx, cy, r - 2);
  g.fillStyle(armor ? 0xf6d579 : 0xffedb0, 1);
  g.fillTriangle(cx, cy - r * 0.55, cx + r * 0.45, cy, cx, cy + r * 0.4);
  g.fillTriangle(cx, cy - r * 0.55, cx - r * 0.45, cy, cx, cy + r * 0.4);
  g.fillStyle(0xffffff, 0.65);
  g.fillCircle(cx - r * 0.43, cy - r * 0.44, r * 0.14);
  if (armor) {
    g.lineStyle(3, 0xb8944f, 1);
    g.strokeCircle(cx, cy, r - 4);
    g.fillStyle(0xf8e4a3, 1);
    for (let i = 0; i < 4; i++)
      g.fillCircle(cx + Math.cos((i * Math.PI) / 2) * (r - 4), cy + Math.sin((i * Math.PI) / 2) * (r - 4), 2);
  }
}

export function makeTextures(scene: Phaser.Scene): void {
  const s = R * 2 + 4;
  const c = s / 2;
  BALL_COLORS.forEach((color, i) => {
    make(scene, `ball-${i}`, s, s, (g) => shadedBall(g, c, c, R, color));
    make(scene, `ball-armor-${i}`, s, s, (g) => shadedBall(g, c, c, R, color, true));
  });
  make(scene, 'shield', s + 8, s + 8, (g) => {
    g.lineStyle(3, 0xb9eee1, 0.95);
    g.strokeCircle((s + 8) / 2, (s + 8) / 2, R + 3);
    g.fillStyle(0xb9eee1, 0.18);
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
