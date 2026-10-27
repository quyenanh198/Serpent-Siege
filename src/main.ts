import Phaser from 'phaser';
import { BootScene } from './game/scenes/BootScene';
import { PlayScene } from './game/scenes/PlayScene';
import { ProfileScene } from './game/scenes/ProfileScene';
import { ResultScene } from './game/scenes/ResultScene';
import { SettingsScene } from './game/scenes/SettingsScene';
import { ShopScene } from './game/scenes/ShopScene';
import { StageSelectScene } from './game/scenes/StageSelectScene';
import { TitleScene } from './game/scenes/TitleScene';
import { COLORS, H, W } from './game/ui';
import { installErrorLog } from './game/errorLog';

installErrorLog();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: COLORS.bg,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 2 },
  fps: { target: 60 },
  scene: [
    BootScene,
    ProfileScene,
    TitleScene,
    StageSelectScene,
    PlayScene,
    ResultScene,
    ShopScene,
    SettingsScene,
  ],
});
