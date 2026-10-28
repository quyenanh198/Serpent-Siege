import Phaser from 'phaser';
import { STAGES } from '../../core/stages';
import type { Difficulty } from '../../core/types';
import type { GoldResult } from '../../meta/gold';
import { applyEndlessRun, applyStageRun, isUnlocked } from '../../meta/progress';
import { app, fmtGold, persist } from '../app';
import { backdrop, button, COLORS, goldLabel, panel, text, W } from '../ui';

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
      headline = r.won ? 'Stage cleared!' : 'The snake got through';
      void persist(out.save);
    } else {
      const out = applyEndlessRun(app.save, { destroyedHp: r.destroyedHp, progress: r.progress });
      gold = out.gold;
      headline = `Reached segment ${r.progress}`;
      extra = out.newBest ? 'New best!' : `Best: ${out.save.endless.bestSegment}`;
      void persist(out.save);
    }

    goldLabel(this, fmtGold(app.save.gold));
    const crest = this.add.graphics();
    crest.fillStyle(r.won ? 0x315f54 : 0x563e3a, 1);
    crest.fillCircle(W / 2, 160, 85);
    crest.lineStyle(5, r.won ? COLORS.accent : COLORS.bad, 1);
    crest.strokeCircle(W / 2, 160, 82);
    text(this, W / 2, 160, r.won ? '★' : '!', 94, r.won ? COLORS.gold : COLORS.text);
    text(this, W / 2, 290, headline.toUpperCase(), 45, r.won ? COLORS.gold : COLORS.text, {
      fontStyle: 'bold',
    });
    if (extra) text(this, W / 2, 340, extra, 27, COLORS.gold);
    panel(this, W / 2, 530, 620, 300);
    const lines: [string, number][] = [
      ['Segments destroyed', gold.base],
      ['Clear bonus', gold.clearBonus],
      ['First clear bonus', gold.firstClearBonus],
      ['Comeback bonus', gold.comebackBonus],
    ];
    text(
      this,
      W / 2,
      414,
      `${r.destroyed} segments in ${Math.floor(r.time / 60)}:${String(r.time % 60).padStart(2, '0')}`,
      28,
      COLORS.dim,
    );
    lines
      .filter(([, v], i) => i === 0 || v > 0)
      .forEach(([label, v], i) => {
        text(this, 98, 474 + i * 48, label, 27, COLORS.text).setOrigin(0, 0.5);
        text(this, W - 98, 474 + i * 48, `+${v.toFixed(1)}`, 27, COLORS.gold).setOrigin(1, 0.5);
      });
    panel(this, W / 2, 735, 620, 90, 0x315f54);
    text(this, 90, 735, 'GOLD EARNED', 27, COLORS.text).setOrigin(0, 0.5);
    text(this, W - 90, 735, `+${gold.total.toFixed(1)}`, 37, COLORS.gold, { fontStyle: 'bold' }).setOrigin(
      1,
      0.5,
    );

    let y = 855;
    const next = r.stageIndex !== undefined ? r.stageIndex + 1 : -1;
    if (r.mode === 'stage' && r.won && next < STAGES.length && isUnlocked(app.save, next, 'standard')) {
      button(
        this,
        W / 2,
        y,
        460,
        90,
        'Next stage',
        () => this.scene.start('Play', { mode: 'stage', stageIndex: next, difficulty: 'standard' }),
        {
          color: 0x396659,
        },
      );
      y += 115;
    }
    const again =
      r.mode === 'stage'
        ? { mode: 'stage', stageIndex: r.stageIndex, difficulty: r.difficulty }
        : { mode: 'endless' };
    button(this, W / 2, y, 460, 90, r.won ? 'Play again' : 'Retry', () => this.scene.start('Play', again), {
      color: 0x396659,
    });
    button(this, W / 2, y + 115, 460, 90, 'Shop', () => this.scene.start('Shop', { back: 'Result', again }));
    button(this, W / 2, y + 230, 460, 90, 'Menu', () =>
      this.scene.start(r.mode === 'stage' ? 'StageSelect' : 'Title'),
    );
  }
}
