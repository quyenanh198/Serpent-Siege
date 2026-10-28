import Phaser from 'phaser';
import { buyRank, isMaxed, rankCost, SHOP_INFO, SHOP_STATS, type ShopStat } from '../../meta/shop';
import { app, fmtGold, persist } from '../app';
import { audio } from '../audio';
import { backButton, button, COLORS, goldLabel, text, W } from '../ui';

const ICON: Record<ShopStat, string> = { attack: '✦', attackSpeed: '↻', critChance: '◎', critDamage: '✹' };
const CAPTION: Record<ShopStat, string> = {
  attack: 'HIT HARDER',
  attackSpeed: 'FIRE FASTER',
  critChance: 'FIND WEAK SPOTS',
  critDamage: 'MAKE CRITS COUNT',
};

export class ShopScene extends Phaser.Scene {
  private back: { scene: string; data?: object } = { scene: 'Title' };
  constructor() {
    super('Shop');
  }
  init(data: { back?: string; again?: object }) {
    this.back =
      data.back === 'Result' && data.again ? { scene: 'Play', data: data.again } : { scene: 'Title' };
  }
  create() {
    this.add.rectangle(W / 2, 640, W, 1280, 0x103b32);
    this.add.image(W / 2, 240, 'serpent-armory').setDisplaySize(W, 480);
    this.add.rectangle(W / 2, 480, W, 100, 0x092d29, 0.92);
    backButton(this, this.back.scene, this.back.data);
    goldLabel(this, fmtGold(app.save.gold));
    text(this, 36, 455, 'THE ARMORY', 54, COLORS.text, { fontStyle: 'bold' }).setOrigin(0, 0.5);
    text(this, 38, 517, 'FORGE YOUR DEFENSE', 21, COLORS.gold, { fontStyle: 'bold' }).setOrigin(0, 0.5);
    SHOP_STATS.forEach((stat, i) => this.row(stat, 610 + i * 158));
  }
  private row(stat: ShopStat, y: number) {
    const rank = app.save.shop[stat];
    const info = SHOP_INFO[stat];
    const maxed = isMaxed(stat, rank);
    const cost = rankCost(stat, rank);
    const afford = app.save.gold >= cost;
    const g = this.add.graphics();
    g.fillStyle(0xfff2d9, 1);
    g.fillRoundedRect(28, y - 67, 664, 136, 22);
    g.fillStyle(0xf7dca4, 1);
    g.fillRoundedRect(40, y - 54, 105, 108, 19);
    g.fillStyle(0x096354, 1);
    g.fillCircle(92, y, 38);
    text(this, 92, y, ICON[stat], 50, COLORS.gold, { fontStyle: 'bold' });
    text(this, 166, y - 42, info.name.toUpperCase(), 28, '#123f38', { fontStyle: 'bold' }).setOrigin(0, 0.5);
    text(this, 166, y - 5, CAPTION[stat], 17, '#588377', { fontStyle: 'bold' }).setOrigin(0, 0.5);
    text(this, 166, y + 32, `RANK ${rank}  ·  ${info.effect(rank)}`, 20, '#24564d').setOrigin(0, 0.5);
    button(this, 590, y + 3, 170, 75, maxed ? 'MAX' : `+1   ${cost}G`, () => void this.buy(stat), {
      disabled: maxed || !afford,
      color: 0x0d7865,
      size: 25,
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
