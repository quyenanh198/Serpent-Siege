import Phaser from 'phaser';
import { segmentCount } from '../../core/difficulty';
import { STAGES } from '../../core/stages';
import { DIFFICULTIES, DIFFICULTY_LABELS, type Difficulty } from '../../core/types';
import { isUnlocked } from '../../meta/progress';
import { app, fmtGold } from '../app';
import { arenaForStage } from '../arenas';
import { backdrop, backButton, button, COLORS, goldLabel, text, W } from '../ui';

const NODE_X = [118, 270, 458, 595, 540, 375, 190, 115, 280, 485];
const NODE_Y = [280, 358, 318, 417, 525, 480, 560, 665, 730, 690];
const DIFF_COLOR: Record<Difficulty, number> = { standard: 0x25a975, hard: 0xcf9335, expert: 0xc85d52 };

export class StageSelectScene extends Phaser.Scene {
  private world = 1;
  private selected = 0;
  private difficulty: Difficulty = 'standard';
  private sheet?: Phaser.GameObjects.Container;

  constructor() {
    super('StageSelect');
  }

  init(data: { world?: number; stageIndex?: number }) {
    if (data.world) this.world = data.world;
    else {
      const newest = STAGES.reduce((n, _, i) => (isUnlocked(app.save, i, 'standard') ? i : n), 0);
      this.world = STAGES[newest].world;
    }
    this.selected = data.stageIndex ?? (this.world - 1) * 10;
    this.difficulty = 'standard';
  }

  create() {
    backdrop(this);
    this.add.rectangle(W / 2, 58, W, 116, 0x062622, 0.92);
    backButton(this, 'Title');
    goldLabel(this, fmtGold(app.save.gold));
    text(this, W / 2, 56, 'THE JOURNEY', 32, COLORS.text, { fontStyle: 'bold' });
    text(
      this,
      W / 2,
      154,
      this.world === 1 ? '01  ·  SUNKEN GARDEN' : '02  ·  EMBER TEMPLE',
      33,
      COLORS.gold,
      { fontStyle: 'bold' },
    );
    if (this.world > 1)
      button(this, 62, 153, 70, 64, '‹', () => this.scene.restart({ world: 1 }), { size: 39 });
    if (this.world < 2)
      button(this, W - 62, 153, 70, 64, '›', () => this.scene.restart({ world: 2 }), { size: 39 });

    DIFFICULTIES.forEach((difficulty, i) => {
      const x = 146 + i * 205;
      this.add.circle(x, 215, 7, DIFF_COLOR[difficulty]);
      text(this, x + 14, 215, DIFFICULTY_LABELS[difficulty], 17, COLORS.dim).setOrigin(0, 0.5);
    });

    const route = this.add.graphics();
    route.lineStyle(17, 0x092d28, 0.9);
    route.beginPath();
    route.moveTo(NODE_X[0], NODE_Y[0]);
    for (let i = 1; i < 10; i++) route.lineTo(NODE_X[i], NODE_Y[i]);
    route.strokePath();
    route.lineStyle(5, COLORS.accent, 0.88);
    route.beginPath();
    route.moveTo(NODE_X[0], NODE_Y[0]);
    for (let i = 1; i < 10; i++) route.lineTo(NODE_X[i], NODE_Y[i]);
    route.strokePath();

    for (let local = 0; local < 10; local++) this.node((this.world - 1) * 10 + local, local);
    this.drawSheet();
  }

  private node(index: number, local: number) {
    const x = NODE_X[local],
      y = NODE_Y[local];
    const unlocked = isUnlocked(app.save, index, 'standard');
    const chosen = index === this.selected;
    const circle = this.add.circle(
      x,
      y,
      chosen ? 49 : 41,
      unlocked ? (chosen ? COLORS.accent : 0xfff1cf) : 0x234d43,
    );
    circle.setStrokeStyle(5, chosen ? 0xffffff : 0x0b3c34, 1);
    text(this, x, y, unlocked ? String(local + 1) : '×', 30, unlocked ? '#0b3b33' : COLORS.dim, {
      fontStyle: 'bold',
    });
    DIFFICULTIES.forEach((difficulty, i) => {
      const cleared = app.save.stages[STAGES[index].id]?.cleared.includes(difficulty) ?? false;
      this.add
        .circle(x - 18 + i * 18, y + 27, 6, cleared ? DIFF_COLOR[difficulty] : 0x6d837b)
        .setStrokeStyle(1, cleared ? 0xffe7a5 : 0x314b43);
    });
    this.add
      .zone(x, y, 94, 94)
      .setInteractive({ useHandCursor: unlocked })
      .on('pointerup', () => {
        if (unlocked) this.scene.restart({ world: this.world, stageIndex: index });
      });
  }

  private drawSheet() {
    this.sheet?.destroy();
    const st = STAGES[this.selected];
    const arena = arenaForStage(st.id);
    const rec = app.save.stages[st.id];
    const layer = this.add.container(0, 0).setDepth(5);
    layer.add(this.add.rectangle(W / 2, 1035, W, 490, 0x062622, 0.98));
    layer.add(this.add.rectangle(W / 2, 796, 90, 6, COLORS.accent));
    layer.add(
      text(
        this,
        42,
        843,
        `${st.boss ? 'BOSS ENCOUNTER' : `STAGE ${st.world}-${st.number - (st.world - 1) * 10}`}  ·  ${arena.name}`,
        22,
        COLORS.gold,
        { fontStyle: 'bold' },
      ).setOrigin(0, 0.5),
    );
    layer.add(this.add.image(605, 878, arena.image).setDisplaySize(150, 94));
    layer.add(
      text(this, 42, 908, `DEFEND THE ${st.goal.picture.toUpperCase()}`, 43, COLORS.text, {
        fontStyle: 'bold',
      }).setOrigin(0, 0.5),
    );
    layer.add(
      text(
        this,
        42,
        961,
        `${segmentCount(st.number, this.difficulty)} SEGMENTS  ·  ${rec?.cleared.length ?? 0}/3 CLEARED`,
        21,
        COLORS.dim,
      ).setOrigin(0, 0.5),
    );
    layer.add(text(this, 42, 1022, 'DIFFICULTY', 21, COLORS.gold, { fontStyle: 'bold' }).setOrigin(0, 0.5));
    DIFFICULTIES.forEach((d, i) => {
      const open = isUnlocked(app.save, this.selected, d);
      layer.add(
        button(
          this,
          130 + i * 230,
          1084,
          202,
          65,
          `${rec?.cleared.includes(d) ? '✓ ' : ''}${DIFFICULTY_LABELS[d]}`,
          () => {
            this.difficulty = d;
            this.drawSheet();
          },
          { disabled: !open, color: this.difficulty === d ? DIFF_COLOR[d] : 0x24554b, size: 22 },
        ),
      );
    });
    layer.add(
      button(
        this,
        W / 2,
        1190,
        630,
        94,
        'PLAY STAGE   ›',
        () =>
          this.scene.start('Play', { mode: 'stage', stageIndex: this.selected, difficulty: this.difficulty }),
        { color: 0xdf794e, size: 32 },
      ),
    );
    this.sheet = layer;
  }
}
