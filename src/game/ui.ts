import Phaser from 'phaser';
import { audio } from './audio';

export const W = 720;
export const H = 1280;

export const COLORS = {
  bg: 0x14121f,
  panel: 0x231f36,
  panelHi: 0x2f2a48,
  accent: 0xf5b942,
  good: 0x4cd07d,
  bad: 0xe5534b,
  text: '#f3eefc',
  dim: '#9a93b5',
  gold: '#f5c542',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

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
    g.fillStyle(c, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    g.lineStyle(2, 0xffffff, 0.12);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
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
  return g;
}

/** Gold counter in the top-right corner. */
export function goldLabel(scene: Phaser.Scene, gold: string): Phaser.GameObjects.Text {
  return text(scene, W - 30, 50, `● ${gold}`, 32, COLORS.gold).setOrigin(1, 0.5);
}

export function backButton(scene: Phaser.Scene, to: string, data?: object) {
  return button(scene, 90, 50, 130, 64, '‹ Back', () => scene.scene.start(to, data), { size: 26 });
}
