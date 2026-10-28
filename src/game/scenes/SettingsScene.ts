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
    backButton(this, 'Title');
    text(this, W / 2, 150, 'Settings', 56, COLORS.text, { fontStyle: 'bold' });
    const s = app.save.settings;
    this.volume('Sound effects', 'sfx', 300);
    this.volume('Music', 'music', 450);
    this.toggle('Vibration', 'vibration', 600);
    this.toggle('Screen shake', 'shake', 720);
    void s;
    text(
      this,
      W / 2,
      1180,
      `Player: ${app.profile?.name ?? ''}${app.store.online ? '' : ' (offline)'}`,
      24,
      COLORS.dim,
    );
  }

  private set(patch: Partial<Settings>) {
    void persist({ ...app.save, settings: { ...app.save.settings, ...patch } });
    this.scene.restart();
  }

  private volume(label: string, key: 'sfx' | 'music', y: number) {
    const v = app.save.settings[key];
    text(this, 60, y - 40, label, 32, COLORS.text).setOrigin(0, 0.5);
    const steps = [0, 0.25, 0.5, 0.75, 1];
    steps.forEach((step, i) => {
      button(
        this,
        120 + i * 120,
        y + 30,
        100,
        70,
        step === 0 ? 'Off' : `${step * 100}`,
        () => {
          this.set({ [key]: step });
          if (key === 'sfx') audio.play('click');
        },
        { color: Math.abs(v - step) < 0.01 ? 0x4a3f78 : undefined, size: 24 },
      );
    });
  }

  private toggle(label: string, key: 'vibration' | 'shake', y: number) {
    const on = app.save.settings[key];
    text(this, 60, y, label, 32, COLORS.text).setOrigin(0, 0.5);
    button(this, W - 130, y, 160, 76, on ? 'On' : 'Off', () => this.set({ [key]: !on }), {
      color: on ? 0x2d5a3f : undefined,
    });
  }
}
