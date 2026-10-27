import Phaser from 'phaser';
import { segmentCount } from '../../core/difficulty';
import { STAGES } from '../../core/stages';
import { DIFFICULTIES, type Difficulty } from '../../core/types';
import { isUnlocked } from '../../meta/progress';
import { app, fmtGold } from '../app';
import { backButton, button, COLORS, goldLabel, H, panel, text, W } from '../ui';

const DIFF_LABEL: Record<Difficulty, string> = { standard: 'Standard', hard: 'Hard', expert: 'Expert' };
const DIFF_COLOR: Record<Difficulty, number> = { standard: 0x4cd07d, hard: 0xf5a742, expert: 0xe5534b };

export class StageSelectScene extends Phaser.Scene {
  private world = 1;

  constructor() {
    super('StageSelect');
  }

  init(data: { world?: number }) {
    if (data.world) this.world = data.world;
    else {
      // Open on the world of the newest unlocked stage.
      const newest = STAGES.reduce((n, _, i) => (isUnlocked(app.save, i, 'standard') ? i : n), 0);
      this.world = STAGES[newest].world;
    }
  }

  create() {
    backButton(this, 'Title');
    goldLabel(this, fmtGold(app.save.gold));
    text(this, W / 2, 140, `World ${this.world}`, 44, COLORS.text, { fontStyle: 'bold' });
    if (this.world > 1)
      button(this, 120, 140, 110, 64, '‹', () => this.scene.restart({ world: this.world - 1 }), { size: 40 });
    if (this.world < 2)
      button(this, W - 120, 140, 110, 64, '›', () => this.scene.restart({ world: this.world + 1 }), {
        size: 40,
      });

    STAGES.forEach((st, i) => {
      if (st.world !== this.world) return;
      const local = st.number - (this.world - 1) * 10 - 1;
      const x = local % 2 === 0 ? W / 2 - 165 : W / 2 + 165;
      const y = 280 + Math.floor(local / 2) * 185;
      this.tile(i, x, y);
    });
  }

  private tile(i: number, x: number, y: number) {
    const st = STAGES[i];
    const unlocked = isUnlocked(app.save, i, 'standard');
    const rec = app.save.stages[st.id];
    const g = panel(this, x, y, 310, 165, unlocked ? COLORS.panelHi : 0x1d1a2c);
    void g;
    text(
      this,
      x,
      y - 35,
      `${st.world}-${st.number - (st.world - 1) * 10}`,
      46,
      unlocked ? COLORS.text : COLORS.dim,
      {
        fontStyle: 'bold',
      },
    );
    if (st.boss) text(this, x + 110, y - 55, 'BOSS', 20, COLORS.gold, { fontStyle: 'bold' });
    if (!unlocked) {
      text(this, x, y + 30, 'Locked', 24, COLORS.dim);
      return;
    }
    DIFFICULTIES.forEach((d, k) => {
      const done = rec?.cleared.includes(d) ?? false;
      const dot = this.add.circle(x - 60 + k * 60, y + 35, 16, done ? DIFF_COLOR[d] : 0x3a3550);
      dot.setStrokeStyle(2, DIFF_COLOR[d], 0.8);
      text(this, x - 60 + k * 60, y + 35, d[0].toUpperCase(), 18, done ? '#14121f' : COLORS.dim, {
        fontStyle: 'bold',
      });
    });
    const zone = this.add.zone(x, y, 310, 165).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => this.pickDifficulty(i));
  }

  private pickDifficulty(i: number) {
    const st = STAGES[i];
    const layer = this.add.container(0, 0).setDepth(10);
    const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setInteractive();
    layer.add(shade);
    layer.add(panel(this, W / 2, H / 2, 600, 640));
    layer.add(
      text(
        this,
        W / 2,
        H / 2 - 250,
        `Stage ${st.world}-${st.number - (st.world - 1) * 10}`,
        44,
        COLORS.text,
        { fontStyle: 'bold' },
      ),
    );
    DIFFICULTIES.forEach((d, k) => {
      const open = isUnlocked(app.save, i, d);
      const label = `${DIFF_LABEL[d]}  ·  ${segmentCount(st.number, d)} segments`;
      layer.add(
        button(
          this,
          W / 2,
          H / 2 - 130 + k * 120,
          500,
          96,
          open ? label : `${DIFF_LABEL[d]}  ·  locked`,
          () => {
            this.scene.start('Play', { mode: 'stage', stageIndex: i, difficulty: d });
          },
          { disabled: !open, color: open ? DIFF_COLOR[d] : undefined, size: 28 },
        ),
      );
    });
    layer.add(button(this, W / 2, H / 2 + 240, 300, 76, 'Cancel', () => layer.destroy(), { size: 28 }));
  }
}
