import Phaser from 'phaser';
import type { Profile } from '../../meta/store';
import { app } from '../app';
import { audio } from '../audio';
import { button, COLORS, H, text, W } from '../ui';

const LAST = 'serpent-siege:lastProfile';

/** Pick your name (no password; trusted LAN). */
export class ProfileScene extends Phaser.Scene {
  constructor() {
    super('Profile');
  }

  create() {
    text(this, W / 2, 200, 'Serpent Siege', 72, COLORS.gold, { fontStyle: 'bold' });
    text(this, W / 2, 290, "Who's playing?", 34, COLORS.dim);
    const status = text(this, W / 2, H - 60, 'Loading players…', 24, COLORS.dim);
    this.input.once('pointerdown', () => audio.unlock());
    void app.store.listProfiles().then((list) => {
      status.setText(app.store.online ? '' : 'Server offline: playing with saves on this device');
      this.showList(list);
    });
  }

  private showList(list: Profile[]) {
    const last = localStorage.getItem(LAST);
    list.slice(0, 9).forEach((p, i) => {
      button(this, W / 2, 400 + i * 92, 460, 76, p.name, () => this.pick(p), {
        color: p.id === last ? 0x4a3f78 : undefined,
      });
    });
    if (app.store.online) {
      button(
        this,
        W / 2,
        400 + Math.min(list.length, 9) * 92 + 20,
        460,
        76,
        '+ New player',
        () => this.create_(),
        {
          color: 0x2d5a3f,
        },
      );
    }
  }

  private async create_() {
    const name = window.prompt('Your name (max 20 letters)')?.trim().slice(0, 20);
    if (!name) return;
    try {
      const p = await app.store.createProfile(name);
      await this.pick(p);
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  private async pick(p: Profile) {
    audio.unlock();
    localStorage.setItem(LAST, p.id);
    app.profile = p;
    app.save = await app.store.load(p);
    audio.setVolumes(app.save.settings.sfx, app.save.settings.music);
    audio.startMusic();
    this.scene.start('Title');
  }
}
