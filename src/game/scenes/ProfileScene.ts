import Phaser from 'phaser';
import type { Profile } from '../../meta/store';
import { app } from '../app';
import { audio } from '../audio';
import { backdrop, button, COLORS, text, W } from '../ui';

/**
 * Sign-in: the game lives inside the Lazybutts Chat and plays as the Chat account, so there is
 * no name to pick. The server reads the Chat session cookie; without one the player is sent to
 * Chat to sign in.
 */
export class ProfileScene extends Phaser.Scene {
  constructor() {
    super('Profile');
  }

  create() {
    backdrop(this);
    text(this, W / 2, 200, 'Serpent Siege', 72, COLORS.gold, { fontStyle: 'bold' });
    const status = text(this, W / 2, 330, 'Signing in…', 30, COLORS.dim);
    this.input.once('pointerdown', () => audio.unlock());
    void app.store.whoami().then((who) => {
      if (who.kind === 'player') {
        void this.pick(who.profile);
      } else if (who.kind === 'login') {
        status.setText('Sign in to Lazybutts Chat to play.\nYour progress is saved to your Chat account.');
        // Chat is served from the site root of the same host.
        button(this, W / 2, 520, 460, 76, 'Open Chat', () => window.location.assign('/'), {
          color: 0x2d5a3f,
        });
        button(this, W / 2, 620, 460, 76, 'Try again', () => this.scene.restart());
      } else {
        status.setText('Server offline.\nYou can play now; progress stays on this device.');
        button(
          this,
          W / 2,
          520,
          460,
          76,
          'Play offline',
          () => void this.pick({ id: 'local', name: 'Player' }),
          {
            color: 0x2d5a3f,
          },
        );
        button(this, W / 2, 620, 460, 76, 'Try again', () => this.scene.restart());
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
