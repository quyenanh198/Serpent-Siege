import Phaser from 'phaser';
import { app, fmtGold } from '../app';
import { backdrop, button, COLORS, goldLabel, text, W } from '../ui';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    backdrop(this);
    goldLabel(this, fmtGold(app.save.gold));
    text(this, 42, 56, app.profile?.name ?? '', 24, COLORS.dim).setOrigin(0, 0.5);
    const crest = this.add.graphics();
    crest.fillStyle(0x244c49, 1);
    crest.fillCircle(W / 2, 263, 112);
    crest.lineStyle(5, COLORS.accent, 0.85);
    crest.strokeCircle(W / 2, 263, 108);
    crest.lineStyle(2, COLORS.accent, 0.4);
    crest.strokeCircle(W / 2, 263, 92);
    this.add
      .image(W / 2, 263, 'head')
      .setScale(2.6)
      .setRotation(-0.5);
    text(this, W / 2, 390, 'SERPENT', 72, COLORS.gold, { fontStyle: 'bold' });
    text(this, W / 2, 465, 'SIEGE', 72, COLORS.gold, { fontStyle: 'bold' });
    const cleared = Object.values(app.save.stages).filter((s) => s.cleared.includes('standard')).length;
    text(this, W / 2, 515, `STAGES CLEARED  ${cleared} / 20`, 22, COLORS.dim);

    button(this, W / 2, 625, 480, 88, 'PLAY STAGES', () => this.scene.start('StageSelect'), {
      size: 38,
      color: 0x396659,
    });
    button(
      this,
      W / 2,
      735,
      480,
      88,
      `ENDLESS  ·  BEST ${app.save.endless.bestSegment}`,
      () => this.scene.start('Play', { mode: 'endless' }),
      {
        size: 34,
      },
    );
    button(this, W / 2, 845, 480, 88, 'UPGRADES', () => this.scene.start('Shop', { back: 'Title' }), {
      size: 38,
    });
    button(this, W / 2, 955, 480, 88, 'SETTINGS', () => this.scene.start('Settings'), { size: 34 });
    if (!app.store.online)
      text(this, W / 2, 1180, 'Server offline: progress is kept on this device', 22, COLORS.dim);
  }
}
