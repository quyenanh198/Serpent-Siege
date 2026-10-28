import Phaser from 'phaser';
import { buyRank, isMaxed, rankCost, SHOP_INFO, SHOP_STATS, type ShopStat } from '../../meta/shop';
import { app, fmtGold, persist } from '../app';
import { audio } from '../audio';
import { backdrop, button, COLORS, goldLabel, panel, text, W } from '../ui';

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
    backdrop(this);
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
    text(this, W / 2, 145, 'THE ARMORY', 55, COLORS.gold, { fontStyle: 'bold' });
    text(this, W / 2, 200, 'PERMANENT POWER', 23, COLORS.dim);
    SHOP_STATS.forEach((stat, i) => this.row(stat, 330 + i * 218));
  }

  private row(stat: ShopStat, y: number) {
    const rank = app.save.shop[stat];
    const info = SHOP_INFO[stat];
    panel(this, W / 2, y, 648, 190);
    const g = this.add.graphics();
    g.fillStyle(0x122c30, 1);
    g.fillCircle(110, y, 57);
    g.lineStyle(3, COLORS.accent, 0.7);
    g.strokeCircle(110, y, 55);
    g.lineStyle(6, COLORS.accent, 1);
    if (stat === 'attack') {
      g.lineBetween(88, y + 24, 130, y - 24);
      g.fillTriangle(132, y - 29, 110, y - 19, 124, y - 5);
    } else if (stat === 'attackSpeed') {
      g.strokeCircle(110, y, 24);
      g.lineBetween(110, y, 126, y - 15);
    } else if (stat === 'critChance') {
      g.strokeCircle(110, y, 25);
      g.lineBetween(110, y - 34, 110, y + 34);
      g.lineBetween(76, y, 144, y);
    } else {
      g.fillStyle(COLORS.accent, 1);
      g.fillTriangle(110, y - 30, 137, y + 20, 83, y + 20);
    }
    text(this, 184, y - 58, info.name.toUpperCase(), 30, COLORS.text, { fontStyle: 'bold' }).setOrigin(
      0,
      0.5,
    );
    text(this, 184, y - 14, info.effect(rank), 24, COLORS.dim).setOrigin(0, 0.5);
    text(this, 184, y + 38, `RANK ${rank}`, 20, COLORS.gold).setOrigin(0, 0.5);
    for (let i = 0; i < 5; i++) {
      this.add.circle(310 + i * 25, y + 39, 7, i < Math.min(rank, 5) ? COLORS.accent : 0x395954);
    }
    const maxed = isMaxed(stat, rank);
    const cost = rankCost(stat, rank);
    const afford = app.save.gold >= cost;
    button(this, W - 126, y, 176, 100, maxed ? 'MAX' : `BUY\n${cost} GOLD`, () => void this.buy(stat), {
      disabled: maxed || !afford,
      color: 0x396659,
      size: 24,
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
