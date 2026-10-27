import Phaser from 'phaser';
import { buyRank, isMaxed, rankCost, SHOP_INFO, SHOP_STATS, type ShopStat } from '../../meta/shop';
import { app, fmtGold, persist } from '../app';
import { audio } from '../audio';
import { button, COLORS, goldLabel, panel, text, W } from '../ui';

export class ShopScene extends Phaser.Scene {
  private back: { scene: string; data?: object } = { scene: 'Title' };

  constructor() {
    super('Shop');
  }

  init(data: { back?: string; again?: object }) {
    // From the result screen, "Back" offers a quick retry instead of re-applying the result.
    this.back =
      data.back === 'Result' && data.again ? { scene: 'Play', data: data.again } : { scene: 'Title' };
  }

  create() {
    goldLabel(this, fmtGold(app.save.gold));
    button(
      this,
      110,
      50,
      170,
      64,
      this.back.scene === 'Play' ? '‹ Play' : '‹ Back',
      () => this.scene.start(this.back.scene, this.back.data),
      { size: 26 },
    );
    text(this, W / 2, 150, 'Shop', 56, COLORS.text, { fontStyle: 'bold' });
    text(this, W / 2, 205, 'Permanent upgrades', 26, COLORS.dim);
    SHOP_STATS.forEach((stat, i) => this.row(stat, 340 + i * 210));
  }

  private row(stat: ShopStat, y: number) {
    const rank = app.save.shop[stat];
    const info = SHOP_INFO[stat];
    panel(this, W / 2, y, 660, 185);
    text(this, 60, y - 50, `${info.name}`, 34, COLORS.text, { fontStyle: 'bold' }).setOrigin(0, 0.5);
    text(this, 60, y, `Rank ${rank}`, 26, COLORS.dim).setOrigin(0, 0.5);
    text(this, 60, y + 45, `Now: ${info.effect(rank)}`, 24, COLORS.text).setOrigin(0, 0.5);
    const maxed = isMaxed(stat, rank);
    const cost = rankCost(stat, rank);
    const afford = app.save.gold >= cost;
    button(this, W - 150, y, 210, 110, maxed ? 'MAX' : `Buy\n● ${cost}`, () => void this.buy(stat), {
      disabled: maxed || !afford,
      color: 0x2d5a3f,
      size: 28,
    });
  }

  private async buy(stat: ShopStat) {
    const r = buyRank(app.save, stat);
    if (!r.ok) return;
    audio.play('upgrade');
    await persist(r.save);
    this.scene.restart({ back: this.back.scene === 'Play' ? 'Result' : 'Title', again: this.back.data });
  }
}
