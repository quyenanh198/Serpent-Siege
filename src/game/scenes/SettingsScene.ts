import Phaser from 'phaser';
import type { Settings } from '../../meta/save';
import { app, persist } from '../app';
import { audio } from '../audio';
import { backdrop, backButton, button, COLORS, panel, text, W } from '../ui';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create() {
    backdrop(this);
    backButton(this, 'Title');
    text(this, W / 2, 150, 'SETTINGS', 56, COLORS.gold, { fontStyle: 'bold' });
    text(this, W / 2, 205, 'MAKE THE TEMPLE YOURS', 23, COLORS.dim);
    text(this, 60, 270, 'AUDIO', 24, COLORS.gold).setOrigin(0, 0.5);
    this.volume('Sound effects', 'sfx', 365);
    this.volume('Music', 'music', 555);
    text(this, 60, 690, 'FEEDBACK', 24, COLORS.gold).setOrigin(0, 0.5);
    this.toggle('Vibration', 'vibration', 770);
    this.toggle('Screen shake', 'shake', 900);
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
    panel(this, W / 2, y + 10, 640, 160);
    text(this, 70, y - 42, label, 31, COLORS.text).setOrigin(0, 0.5);
    const track = this.add.graphics();
    track.fillStyle(0x0d2529, 1);
    track.fillRoundedRect(82, y + 26, 550, 10, 5);
    track.fillStyle(COLORS.accent, 1);
    track.fillRoundedRect(82, y + 26, Math.max(10, 550 * v), 10, 5);
    const steps = [0, 0.25, 0.5, 0.75, 1];
    steps.forEach((step, i) => {
      button(
        this,
        120 + i * 120,
        y + 56,
        85,
        54,
        step === 0 ? 'OFF' : `${step * 100}`,
        () => {
          this.set({ [key]: step });
          if (key === 'sfx') audio.play('click');
        },
        { color: Math.abs(v - step) < 0.01 ? 0x396659 : undefined, size: 22 },
      );
    });
  }

  private toggle(label: string, key: 'vibration' | 'shake', y: number) {
    const on = app.save.settings[key];
    panel(this, W / 2, y, 640, 105);
    text(this, 70, y, label, 31, COLORS.text).setOrigin(0, 0.5);
    button(this, W - 130, y, 150, 68, on ? 'ON' : 'OFF', () => this.set({ [key]: !on }), {
      color: on ? 0x396659 : undefined,
    });
  }
}
