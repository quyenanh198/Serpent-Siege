import { describe, expect, it } from 'vitest';
import { STAGES } from '../src/core/stages';
import { DIFFICULTY_LABELS } from '../src/core/types';
import { arenaForStage } from '../src/game/arenas';

describe('gameplay maps', () => {
  it('assigns three distinct illustrated maps across the campaign', () => {
    expect(new Set(STAGES.map((stage) => arenaForStage(stage.id).image)).size).toBe(3);
    expect(arenaForStage('w1-01').image).toBe('jungle-web-board');
    expect(arenaForStage('w1-02').image).toBe('jungle-falls-board');
    expect(arenaForStage('w2-01').image).toBe('ember-temple-board');
  });

  it('shows Extreme without changing the saved Expert key', () => {
    expect(DIFFICULTY_LABELS.expert).toBe('EXTREME');
  });
});
