import Phaser from 'phaser';
import { app, fmtGold } from '../app';
import { button, COLORS, goldLabel, text, W } from '../ui';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    goldLabel(this, fmtGold(app.save.gold));
    text(this, 30, 50, app.profile?.name ?? '', 30, COLORS.text).setOrigin(0, 0.5);
    text(this, W / 2, 250, 'Serpent', 96, COLORS.gold, { fontStyle: 'bold' });
    text(this, W / 2, 350, 'Siege', 96, COLORS.gold, { fontStyle: 'bold' });
    const cleared = Object.values(app.save.stages).filter((s) => s.cleared.includes('standard')).length;
    text(this, W / 2, 440, `Stages cleared: ${cleared} / 20`, 26, COLORS.dim);

    button(this, W / 2, 560, 480, 96, 'Stages', () => this.scene.start('StageSelect'), {
      size: 38,
      color: 0x4a3f78,
    });
    button(
      this,
      W / 2,
      680,
      480,
      96,
      `Endless  (best ${app.save.endless.bestSegment})`,
      () => this.scene.start('Play', { mode: 'endless' }),
      {
        size: 34,
      },
    );
    button(this, W / 2, 800, 480, 96, 'Shop', () => this.scene.start('Shop', { back: 'Title' }), {
      size: 38,
    });
    button(this, W / 2, 920, 480, 96, 'Settings', () => this.scene.start('Settings'), { size: 38 });
    if (!app.store.online)
      text(this, W / 2, 1180, 'Server offline: progress is kept on this device', 22, COLORS.dim);
  }
}
