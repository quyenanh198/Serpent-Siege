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
    text(this, W / 2, 220, headline, 52, r.won ? COLORS.gold : COLORS.text, { fontStyle: 'bold' });
    if (extra) text(this, W / 2, 290, extra, 30, COLORS.gold);
    panel(this, W / 2, 520, 620, 360);
    const lines: [string, number][] = [
      ['Segments destroyed', gold.base],
      ['Clear bonus', gold.clearBonus],
      ['First clear bonus', gold.firstClearBonus],
      ['Comeback bonus', gold.comebackBonus],
    ];
    text(
      this,
      W / 2,
      380,
      `${r.destroyed} segments in ${Math.floor(r.time / 60)}:${String(r.time % 60).padStart(2, '0')}`,
      28,
      COLORS.dim,
    );
    lines
      .filter(([, v], i) => i === 0 || v > 0)
      .forEach(([label, v], i) => {
        text(this, 140, 440 + i * 50, label, 28, COLORS.text).setOrigin(0, 0.5);
        text(this, W - 140, 440 + i * 50, `+${v.toFixed(1)}`, 28, COLORS.gold).setOrigin(1, 0.5);
      });
    text(this, W / 2, 650, `Gold earned: ${gold.total.toFixed(1)}`, 36, COLORS.gold, { fontStyle: 'bold' });

    let y = 800;
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
          color: 0x2d5a3f,
        },
      );
      y += 115;
    }
    const again =
      r.mode === 'stage'
        ? { mode: 'stage', stageIndex: r.stageIndex, difficulty: r.difficulty }
        : { mode: 'endless' };
    button(this, W / 2, y, 460, 90, r.won ? 'Play again' : 'Retry', () => this.scene.start('Play', again), {
      color: 0x4a3f78,
    });
    button(this, W / 2, y + 115, 460, 90, 'Shop', () => this.scene.start('Shop', { back: 'Result', again }));
    button(this, W / 2, y + 230, 460, 90, 'Menu', () =>
      this.scene.start(r.mode === 'stage' ? 'StageSelect' : 'Title'),
    );
  }
}
