import Phaser from 'phaser';
import type { Profile } from '../../meta/store';
import { app } from '../app';
import { audio } from '../audio';
import { backdrop, button, COLORS, text, W } from '../ui';

/** The game uses the current Chat account, or a local save while the server is offline. */
export class ProfileScene extends Phaser.Scene {
  constructor() {
    super('Profile');
  }
  create() {
    backdrop(this);
    const g = this.add.graphics();
    g.fillStyle(0x062622, 0.96);
    g.fillRoundedRect(0, 660, W, 620, { tl: 66, tr: 66, bl: 0, br: 0 });
    text(this, W / 2, 752, 'SERPENT SIEGE', 62, COLORS.text, { fontStyle: 'bold' });
    const status = text(this, W / 2, 850, 'ENTERING THE SANCTUARY…', 25, COLORS.dim, {
      wordWrap: { width: 570 },
    });
    this.input.once('pointerdown', () => audio.unlock());
    void app.store.whoami().then((who) => {
      if (who.kind === 'player') {
        void this.pick(who.profile);
      } else if (who.kind === 'login') {
        status.setText('Sign in to Lazybutts Chat to play.\nYour journey is saved to your Chat account.');
        button(this, W / 2, 1010, 540, 80, 'OPEN CHAT', () => window.location.assign('/'), {
          color: 0xdf794e,
        });
        button(this, W / 2, 1110, 540, 80, 'TRY AGAIN', () => this.scene.restart());
      } else {
        status.setText('Server offline. You can play now;\nprogress stays on this device.');
        button(
          this,
          W / 2,
          1010,
          540,
          80,
          'PLAY OFFLINE',
          () => void this.pick({ id: 'local', name: 'Player' }),
          { color: 0xdf794e },
        );
        button(this, W / 2, 1110, 540, 80, 'TRY AGAIN', () => this.scene.restart());
      }
    });
  }
  private async pick(p: Profile) {
    audio.unlock();
    app.profile = p;
    app.save = await app.store.load(p);
    audio.setVolumes(app.save.settings.sfx, app.save.settings.music);
    audio.startMusic();
    this.scene.start('Title');
  }
}
