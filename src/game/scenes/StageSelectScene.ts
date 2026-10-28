import Phaser from 'phaser';
import { segmentCount } from '../../core/difficulty';
import { STAGES } from '../../core/stages';
import { DIFFICULTIES, type Difficulty } from '../../core/types';
import { isUnlocked } from '../../meta/progress';
import { app, fmtGold } from '../app';
import { backdrop, backButton, button, COLORS, goldLabel, H, panel, text, W } from '../ui';

const DIFF_LABEL: Record<Difficulty, string> = { standard: 'Standard', hard: 'Hard', expert: 'Expert' };
const DIFF_COLOR: Record<Difficulty, number> = { standard: 0x72cd99, hard: 0xf1bc69, expert: 0xeb735e };

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
    backdrop(this);
    backButton(this, 'Title');
    goldLabel(this, fmtGold(app.save.gold));
    text(this, W / 2, 136, `WORLD ${this.world}`, 50, COLORS.gold, { fontStyle: 'bold' });
    text(this, W / 2, 190, this.world === 1 ? 'THE SUNKEN GARDEN' : 'THE EMBER TEMPLE', 25, COLORS.dim);
    if (this.world > 1)
      button(this, 120, 140, 110, 64, '‹', () => this.scene.restart({ world: this.world - 1 }), { size: 40 });
    if (this.world < 2)
      button(this, W - 120, 140, 110, 64, '›', () => this.scene.restart({ world: this.world + 1 }), {
        size: 40,
      });

    const route = this.add.graphics();
    route.lineStyle(5, COLORS.accent, 0.4);
    route.beginPath();
    route.moveTo(195, 285);
    for (let row = 0; row < 5; row++) {
      const y = 285 + row * 185;
      route.lineTo(row % 2 === 0 ? 525 : 195, y);
      if (row < 4) route.lineTo(row % 2 === 0 ? 525 : 195, y + 185);
    }
    route.strokePath();
    STAGES.forEach((st, i) => {
      if (st.world !== this.world) return;
      const local = st.number - (this.world - 1) * 10 - 1;
      const x = local % 2 === 0 ? W / 2 - 165 : W / 2 + 165;
      const y = 285 + Math.floor(local / 2) * 185;
      this.tile(i, x, y);
    });
  }

  private tile(i: number, x: number, y: number) {
    const st = STAGES[i];
    const unlocked = isUnlocked(app.save, i, 'standard');
    const rec = app.save.stages[st.id];
    panel(this, x, y, 298, 158, unlocked ? COLORS.panelHi : 0x182c30);
    const medal = this.add.graphics();
    medal.fillStyle(unlocked ? 0x315f54 : 0x263b3d, 1);
    medal.fillCircle(x - 94, y - 28, 42);
    medal.lineStyle(3, unlocked ? COLORS.accent : 0x69817e, 0.8);
    medal.strokeCircle(x - 94, y - 28, 41);
    text(
      this,
      x - 94,
      y - 28,
      `${st.number - (st.world - 1) * 10}`,
      43,
      unlocked ? COLORS.text : COLORS.dim,
      {
        fontStyle: 'bold',
      },
    );
    text(this, x + 60, y - 42, st.boss ? 'BOSS' : 'TRAIL', 21, COLORS.gold, {
      fontStyle: 'bold',
    });
    text(this, x + 60, y - 7, unlocked ? 'TAP TO PLAY' : 'LOCKED', 17, COLORS.dim);
    if (!unlocked) {
      return;
    }
    DIFFICULTIES.forEach((d, k) => {
      const done = rec?.cleared.includes(d) ?? false;
      const dot = this.add.circle(x - 65 + k * 65, y + 47, 15, done ? DIFF_COLOR[d] : 0x193337);
      dot.setStrokeStyle(2, DIFF_COLOR[d], 0.8);
      text(this, x - 65 + k * 65, y + 47, d[0].toUpperCase(), 17, done ? '#10282b' : COLORS.dim, {
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
    layer.add(text(this, W / 2, H / 2 - 300, 'CHOOSE YOUR CHALLENGE', 22, COLORS.gold));
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
          { disabled: !open, color: open ? [0x356858, 0x806336, 0x86483f][k] : undefined, size: 28 },
        ),
      );
    });
    layer.add(button(this, W / 2, H / 2 + 240, 300, 76, 'Cancel', () => layer.destroy(), { size: 28 }));
  }
}
