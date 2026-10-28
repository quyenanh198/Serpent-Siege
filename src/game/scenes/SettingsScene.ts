import Phaser from 'phaser';
import type { Settings } from '../../meta/save';
import { app, persist } from '../app';
import { audio } from '../audio';
import { backdrop, backButton, button, COLORS, text, W } from '../ui';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }
  create() {
    backdrop(this);
    this.add.rectangle(W / 2, 68, W, 136, 0x062622, 0.92);
    backButton(this, 'Title');
    text(this, W / 2, 67, 'SETTINGS', 42, COLORS.text, { fontStyle: 'bold' });
    const g = this.add.graphics();
    g.fillStyle(0xfff2d9, 1);
    g.fillRoundedRect(24, 280, 672, 945, { tl: 42, tr: 42, bl: 42, br: 42 });
    g.fillStyle(0xf8ddab, 1);
    g.fillRoundedRect(44, 300, 632, 138, 26);
    text(this, W / 2, 342, 'YOUR ADVENTURE', 35, '#123f38', { fontStyle: 'bold' });
    text(this, W / 2, 394, 'Tune the world to your play style', 22, '#547d70');
    text(this, 72, 491, 'AUDIO', 22, '#117061', { fontStyle: 'bold' }).setOrigin(0, 0.5);
    this.volume('Sound effects', 'sfx', 575);
    this.volume('Music', 'music', 754);
    text(this, 72, 862, 'FEEDBACK', 22, '#117061', { fontStyle: 'bold' }).setOrigin(0, 0.5);
    this.toggle('Vibration', 'vibration', 943);
    this.toggle('Screen shake', 'shake', 1058);
    text(
      this,
      W / 2,
      1175,
      `Signed in as ${app.profile?.name ?? 'Player'}${app.store.online ? '' : ' · offline'}`,
      21,
      '#547d70',
    );
  }
  private set(patch: Partial<Settings>) {
    void persist({ ...app.save, settings: { ...app.save.settings, ...patch } });
    this.scene.restart();
  }
  private volume(label: string, key: 'sfx' | 'music', y: number) {
    const value = app.save.settings[key];
    text(this, 72, y - 53, label, 27, '#153d36', { fontStyle: 'bold' }).setOrigin(0, 0.5);
    text(this, 642, y - 53, `${Math.round(value * 100)}%`, 25, '#117061', { fontStyle: 'bold' }).setOrigin(
      1,
      0.5,
    );
    this.add.rectangle(W / 2, y + 2, 570, 4, 0xdabf8d);
    [0, 0.25, 0.5, 0.75, 1].forEach((step, i) => {
      button(
        this,
        106 + i * 127,
        y + 40,
        104,
        67,
        step === 0 ? 'OFF' : `${step * 100}`,
        () => {
          this.set({ [key]: step });
          if (key === 'sfx') audio.play('click');
        },
        { color: Math.abs(value - step) < 0.01 ? 0xd9764e : 0x196c5b, size: 22 },
      );
    });
  }
  private toggle(label: string, key: 'vibration' | 'shake', y: number) {
    const on = app.save.settings[key];
    this.add.rectangle(W / 2, y, 590, 2, 0xdcc18f, 0.65);
    text(this, 72, y + 48, label, 28, '#153d36', { fontStyle: 'bold' }).setOrigin(0, 0.5);
    button(this, 568, y + 48, 150, 68, on ? 'ON' : 'OFF', () => this.set({ [key]: !on }), {
      color: on ? 0x13976f : 0x786c5b,
      size: 24,
    });
  }
}
