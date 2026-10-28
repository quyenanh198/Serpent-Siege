import Phaser from 'phaser';
import { audio } from './audio';

export const W = 720;
export const H = 1280;

export const COLORS = {
  bg: 0x101d22,
  panel: 0x1a3035,
  panelHi: 0x28464a,
  accent: 0xe9b860,
  good: 0x67c99a,
  bad: 0xea705f,
  text: '#f3eefc',
  dim: '#a3b9b5',
  gold: '#f2cb7b',
};

export const FONT = 'Georgia, "Times New Roman", serif';

/** Decorative stonework shared by every screen; kept behind interactive objects. */
export function backdrop(scene: Phaser.Scene, play = false): void {
  const g = scene.add.graphics().setDepth(-20);
  g.fillGradientStyle(0x0b171c, 0x0b171c, play ? 0x203b3c : 0x234746, play ? 0x203b3c : 0x234746);
  g.fillRect(0, 0, W, H);
  g.lineStyle(2, 0xb3d5bc, 0.045);
  for (let y = 80; y < H; y += 112) g.lineBetween(0, y, W, y);
  for (let x = 30; x < W; x += 115) g.lineBetween(x, 0, x, H);
  g.lineStyle(3, 0xd5ad69, 0.28);
  g.strokeRoundedRect(16, 16, W - 32, H - 32, 24);
  g.lineStyle(1, 0xf2cb7b, 0.18);
  g.strokeRoundedRect(24, 24, W - 48, H - 48, 20);
  for (const [x, y] of [
    [44, 44],
    [W - 44, 44],
    [44, H - 44],
    [W - 44, H - 44],
  ]) {
    g.fillStyle(0xd9b778, 0.55);
    g.fillCircle(x, y, 7);
    g.fillStyle(0x112328, 1);
    g.fillCircle(x, y, 3);
  }
}

export function text(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = 28,
  color = COLORS.text,
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, value, { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center', ...style })
    .setOrigin(0.5);
}

export interface ButtonOptions {
  color?: number;
  size?: number;
  disabled?: boolean;
}

/** A rounded button. Returns the container; `setLabel` updates its text. */
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  opts: ButtonOptions = {},
): Phaser.GameObjects.Container & { setLabel: (s: string) => void } {
  const color = opts.disabled ? 0x3a3550 : (opts.color ?? COLORS.panelHi);
  const g = scene.add.graphics();
  const draw = (c: number) => {
    g.clear();
    g.fillStyle(0x071316, 0.5);
    g.fillRoundedRect(-w / 2, -h / 2 + 7, w, h, 18);
    g.fillStyle(c, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    g.lineStyle(2, 0xe7c98d, 0.65);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
    g.lineStyle(1, 0xffffff, 0.15);
    g.lineBetween(-w / 2 + 22, -h / 2 + 9, w / 2 - 22, -h / 2 + 9);
  };
  draw(color);
  const t = text(scene, 0, 0, label, opts.size ?? 30, opts.disabled ? COLORS.dim : COLORS.text);
  const c = scene.add.container(x, y, [g, t]) as Phaser.GameObjects.Container & {
    setLabel: (s: string) => void;
  };
  c.setSize(w, h);
  c.setLabel = (s: string) => t.setText(s);
  if (!opts.disabled) {
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => draw(Phaser.Display.Color.ValueToColor(color).brighten(15).color));
    c.on('pointerout', () => draw(color));
    c.on('pointerup', () => {
      audio.play('click');
      onClick();
    });
  }
  return c;
}

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  color = COLORS.panel,
  alpha = 1,
) {
  const g = scene.add.graphics();
  g.fillStyle(color, alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 22);
  g.lineStyle(2, COLORS.accent, 0.45 * alpha);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 22);
  return g;
}

/** Gold counter in the top-right corner. */
export function goldLabel(scene: Phaser.Scene, gold: string): Phaser.GameObjects.Text {
  return text(scene, W - 30, 50, `● ${gold}`, 32, COLORS.gold).setOrigin(1, 0.5);
}

export function backButton(scene: Phaser.Scene, to: string, data?: object) {
  return button(scene, 90, 50, 130, 64, '‹ Back', () => scene.scene.start(to, data), { size: 26 });
}
