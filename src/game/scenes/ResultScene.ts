import Phaser from 'phaser';
import { STAGES } from '../../core/stages';
import type { Difficulty } from '../../core/types';
import type { GoldResult } from '../../meta/gold';
import { applyEndlessRun, applyStageRun, isUnlocked } from '../../meta/progress';
import { app, fmtGold, persist } from '../app';
import { backdrop, button, COLORS, goldLabel, text, W } from '../ui';

export interface ResultData {
  mode: 'stage' | 'endless';
  won: boolean;
  destroyedHp: number[];
  destroyed: number;
  progress: number;
  time: number;
  stageIndex?: number;
  difficulty?: Difficulty;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }
  create(r: ResultData) {
    backdrop(this);
    let gold: GoldResult;
    let headline: string;
    let extra = '';
    if (r.mode === 'stage') {
      const st = STAGES[r.stageIndex!];
      const out = applyStageRun(app.save, {
        stageId: st.id,
        difficulty: r.difficulty!,
        cleared: r.won,
        destroyedHp: r.destroyedHp,
        score: r.destroyed,
      });
      gold = out.gold;
      headline = r.won ? 'SANCTUARY SAVED' : 'THE SERPENT BROKE THROUGH';
      void persist(out.save);
    } else {
      const out = applyEndlessRun(app.save, { destroyedHp: r.destroyedHp, progress: r.progress });
      gold = out.gold;
      headline = `SEGMENT ${r.progress} REACHED`;
      extra = out.newBest ? 'NEW PERSONAL BEST' : `BEST: ${out.save.endless.bestSegment}`;
      void persist(out.save);
    }
    goldLabel(this, fmtGold(app.save.gold));
    this.add.rectangle(W / 2, 65, W, 130, 0x062622, 0.86);
    text(this, W / 2, 67, 'RUN COMPLETE', 34, COLORS.text, { fontStyle: 'bold' });
    const paper = this.add.graphics();
    paper.fillStyle(0xfff2d9, 1);
    paper.fillRoundedRect(32, 285, 656, 590, 38);
    paper.fillStyle(r.won ? 0x0f8b68 : 0xc75e4b, 1);
    paper.fillCircle(W / 2, 322, 91);
    paper.lineStyle(7, 0xffd66f, 1);
    paper.strokeCircle(W / 2, 322, 86);
    text(this, W / 2, 323, r.won ? '★' : '!', 98, COLORS.gold, { fontStyle: 'bold' });
    text(this, W / 2, 463, headline, r.won ? 38 : 31, '#153f35', { fontStyle: 'bold' });
    if (extra) text(this, W / 2, 511, extra, 22, '#b46445', { fontStyle: 'bold' });
    text(
      this,
      W / 2,
      552,
      `${r.destroyed} SEGMENTS  ·  ${Math.floor(r.time / 60)}:${String(r.time % 60).padStart(2, '0')}`,
      22,
      '#588075',
    );
    paper.lineStyle(2, 0xd9bd87, 1);
    paper.lineBetween(85, 595, 635, 595);
    const lines: [string, number][] = [
      ['Segments destroyed', gold.base],
      ['Clear bonus', gold.clearBonus],
      ['First clear bonus', gold.firstClearBonus],
      ['Comeback bonus', gold.comebackBonus],
    ];
    lines
      .filter(([, v], i) => i === 0 || v > 0)
      .forEach(([label, v], i) => {
        text(this, 88, 638 + i * 43, label, 23, '#285b4d').setOrigin(0, 0.5);
        text(this, 628, 638 + i * 43, `+${v.toFixed(1)}`, 23, '#117865', { fontStyle: 'bold' }).setOrigin(
          1,
          0.5,
        );
      });
    this.add.rectangle(W / 2, 817, 590, 76, 0x0e775f);
    text(this, 100, 817, 'GOLD EARNED', 24, COLORS.text, { fontStyle: 'bold' }).setOrigin(0, 0.5);
    text(this, 625, 817, `+${gold.total.toFixed(1)}`, 35, COLORS.gold, { fontStyle: 'bold' }).setOrigin(
      1,
      0.5,
    );

    const again =
      r.mode === 'stage'
        ? { mode: 'stage', stageIndex: r.stageIndex, difficulty: r.difficulty }
        : { mode: 'endless' };
    const next = r.stageIndex !== undefined ? r.stageIndex + 1 : -1;
    let y = 947;
    if (r.mode === 'stage' && r.won && next < STAGES.length && isUnlocked(app.save, next, 'standard')) {
      button(
        this,
        W / 2,
        y,
        590,
        80,
        'NEXT STAGE   ›',
        () => this.scene.start('Play', { mode: 'stage', stageIndex: next, difficulty: 'standard' }),
        { color: 0xdf794e, size: 27 },
      );
      y += 91;
    }
    button(
      this,
      W / 2,
      y,
      590,
      80,
      r.won ? 'PLAY AGAIN' : 'TRY AGAIN',
      () => this.scene.start('Play', again),
      { color: 0x137c67, size: 27 },
    );
    button(this, 193, y + 98, 258, 78, 'ARMORY', () => this.scene.start('Shop', { back: 'Result', again }), {
      color: 0x24564c,
      size: 25,
    });
    button(
      this,
      527,
      y + 98,
      258,
      78,
      'JOURNEY',
      () => this.scene.start(r.mode === 'stage' ? 'StageSelect' : 'Title'),
      { color: 0x24564c, size: 25 },
    );
  }
}
