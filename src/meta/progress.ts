import { STAGES } from '../core/stages';
import type { Difficulty } from '../core/types';
import { runGold, type GoldResult } from './gold';
import type { SaveData, StageRecord } from './save';

const emptyRecord = (): StageRecord => ({ cleared: [], bestScore: 0, fails: {} });

export function isUnlocked(save: SaveData, stageIndex: number, difficulty: Difficulty): boolean {
  const rec = save.stages[STAGES[stageIndex].id];
  if (difficulty === 'standard') {
    return (
      stageIndex === 0 || (save.stages[STAGES[stageIndex - 1].id]?.cleared.includes('standard') ?? false)
    );
  }
  if (difficulty === 'hard') return rec?.cleared.includes('standard') ?? false;
  return rec?.cleared.includes('hard') ?? false;
}

export interface StageRunSummary {
  stageId: string;
  difficulty: Difficulty;
  cleared: boolean;
  destroyedHp: number[];
  score: number;
}

/** Apply a finished stage run: gold, clears, comeback counter, best score. */
export function applyStageRun(save: SaveData, run: StageRunSummary): { save: SaveData; gold: GoldResult } {
  const rec = save.stages[run.stageId] ?? emptyRecord();
  const firstClear = run.cleared && !rec.cleared.includes(run.difficulty);
  const fails = rec.fails[run.difficulty] ?? 0;
  const gold = runGold({ destroyedHp: run.destroyedHp, cleared: run.cleared, firstClear, fails });
  const next: StageRecord = {
    cleared: firstClear ? [...rec.cleared, run.difficulty] : rec.cleared,
    bestScore: Math.max(rec.bestScore, run.score),
    fails: { ...rec.fails, [run.difficulty]: run.cleared ? 0 : fails + 1 },
  };
  return {
    save: { ...save, gold: save.gold + gold.total, stages: { ...save.stages, [run.stageId]: next } },
    gold,
  };
}

export function applyEndlessRun(
  save: SaveData,
  run: { destroyedHp: number[]; progress: number },
): { save: SaveData; gold: GoldResult; newBest: boolean } {
  const gold = runGold({ destroyedHp: run.destroyedHp, cleared: false, firstClear: false, fails: 0 });
  const newBest = run.progress > save.endless.bestSegment;
  return {
    save: {
      ...save,
      gold: save.gold + gold.total,
      endless: { bestSegment: Math.max(save.endless.bestSegment, run.progress) },
    },
    gold,
    newBest,
  };
}
