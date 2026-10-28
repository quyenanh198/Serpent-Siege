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
    text(this, 32, 49, app.profile?.name ?? '', 23, COLORS.text, { fontStyle: 'bold' }).setOrigin(0, 0.5);
    const shade = this.add.graphics();
    shade.fillStyle(0x06211e, 0.96);
    shade.fillRoundedRect(0, 650, W, 630, { tl: 70, tr: 70, bl: 0, br: 0 });
    this.add.rectangle(W / 2, 687, 92, 7, COLORS.accent);
    text(this, W / 2, 741, 'SERPENT SIEGE', 64, COLORS.text, { fontStyle: 'bold' });
    text(this, W / 2, 798, 'DEFEND THE LAST SANCTUARY', 23, COLORS.gold, { fontStyle: 'bold' });
    const cleared = Object.values(app.save.stages).filter((s) => s.cleared.includes('standard')).length;
    text(this, W / 2, 841, `${cleared} OF 20 STAGES CLEARED`, 21, COLORS.dim);
    button(this, W / 2, 930, 570, 88, 'CONTINUE JOURNEY   ›', () => this.scene.start('StageSelect'), {
      size: 30,
      color: 0xdf794e,
    });
    button(
      this,
      W / 2,
      1030,
      570,
      78,
      `ENDLESS SURVIVAL   ·   BEST ${app.save.endless.bestSegment}`,
      () => this.scene.start('Play', { mode: 'endless' }),
      { size: 24, color: 0x176c5e },
    );
    button(this, 203, 1144, 250, 84, 'ARMORY', () => this.scene.start('Shop', { back: 'Title' }), {
      size: 28,
      color: 0x24564c,
    });
    button(this, 517, 1144, 250, 84, 'SETTINGS', () => this.scene.start('Settings'), {
      size: 28,
      color: 0x24564c,
    });
    if (!app.store.online) text(this, W / 2, 1235, 'Offline · progress stays on this device', 18, COLORS.dim);
  }
}
