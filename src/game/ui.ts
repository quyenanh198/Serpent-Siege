import Phaser from 'phaser';
import { audio } from './audio';

export const W = 720;
export const H = 1280;

export const COLORS = {
  bg: 0x092623,
  panel: 0x103a34,
  panelHi: 0x176353,
  accent: 0xffc857,
  good: 0x49d9a0,
  bad: 0xff776b,
  text: '#fff9e9',
  dim: '#b6d5ca',
  gold: '#ffd76c',
};

export const FONT = '"Trebuchet MS", Arial, sans-serif';

export function backdrop(scene: Phaser.Scene): void {
  if (scene.textures.exists('jungle-journey')) {
    scene.add
      .image(W / 2, H / 2, 'jungle-journey')
      .setDisplaySize(W, H)
      .setDepth(-20);
    scene.add.rectangle(W / 2, H / 2, W, H, 0x071c1b, 0.36).setDepth(-19);
  } else {
    const g = scene.add.graphics().setDepth(-20);
    g.fillGradientStyle(0x092522, 0x092522, 0x0d3734, 0x0d3734);
    g.fillRect(0, 0, W, H);
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
  const base = opts.disabled ? 0x45675e : (opts.color ?? COLORS.panelHi);
  const g = scene.add.graphics();
  const draw = (color: number) => {
    g.clear();
    g.fillStyle(0x031d1a, 0.38);
    g.fillRoundedRect(-w / 2, -h / 2 + 7, w, h, h / 2);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.fillStyle(0xffffff, 0.13);
    g.fillRoundedRect(-w / 2 + 12, -h / 2 + 6, w - 24, 5, 3);
  };
  draw(base);
  const labelText = text(scene, 0, 0, label, opts.size ?? 28, opts.disabled ? '#b1c2b6' : COLORS.text, {
    fontStyle: 'bold',
  });
  const c = scene.add.container(x, y, [g, labelText]) as Phaser.GameObjects.Container & {
    setLabel: (s: string) => void;
  };
  c.setSize(w, h);
  c.setLabel = (s: string) => labelText.setText(s);
  if (!opts.disabled) {
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => draw(Phaser.Display.Color.ValueToColor(base).brighten(12).color));
    c.on('pointerout', () => draw(base));
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
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 30);
  return g;
}

export function goldLabel(scene: Phaser.Scene, gold: string): Phaser.GameObjects.Text {
  const g = scene.add.graphics();
  g.fillStyle(0x082b28, 0.9);
  g.fillRoundedRect(W - 180, 20, 160, 58, 29);
  g.fillStyle(COLORS.accent, 1);
  g.fillCircle(W - 148, 49, 15);
  g.fillStyle(0xffffff, 0.45);
  g.fillCircle(W - 152, 44, 5);
  return text(scene, W - 32, 49, gold, 26, COLORS.gold, { fontStyle: 'bold' }).setOrigin(1, 0.5);
}

export function backButton(scene: Phaser.Scene, to: string, data?: object) {
  return button(scene, 66, 50, 72, 60, '‹', () => scene.scene.start(to, data), { size: 42, color: 0x103a34 });
}
