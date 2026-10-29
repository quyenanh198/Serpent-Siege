import Phaser from 'phaser';
import balance from '../../core/data/balance.json';
import { buildStageRecipe, endlessStart, stageSpeed } from '../../core/difficulty';
import { describe as describeUpgrade, RUN_UPGRADE_BY_ID } from '../../core/runUpgrades';
import { STEP, World } from '../../core/sim';
import { ENDLESS, STAGES } from '../../core/stages';
import type { Difficulty, StageData } from '../../core/types';
import { app, vibrate } from '../app';
import { audio } from '../audio';
import { BALL_COLORS } from '../textures';
import { backdrop, button, COLORS, H, panel, text, W } from '../ui';

export type PlayData = { mode: 'stage'; stageIndex: number; difficulty: Difficulty } | { mode: 'endless' };

const HUD_H = 110;
const MAX_BALLS = 320;
const MAX_LABELS = 80;
const MAX_BULLETS = 200;

export class PlayScene extends Phaser.Scene {
  private world!: World;
  private data_!: PlayData;
  private stage?: StageData;
  private acc = 0;
  private ended = false;
  private paused = false;
  private balls: Phaser.GameObjects.Image[] = [];
  private bodySpine!: Phaser.GameObjects.Graphics;
  private shields: Phaser.GameObjects.Image[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private bullets: Phaser.GameObjects.Image[] = [];
  private head!: Phaser.GameObjects.Image;
  private turret!: Phaser.GameObjects.Image;
  private aimLine!: Phaser.GameObjects.Graphics;
  private meter!: Phaser.GameObjects.Graphics;
  private info!: Phaser.GameObjects.Text;
  private emitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private overlay?: Phaser.GameObjects.Container;
  private pauseLayer?: Phaser.GameObjects.Container;
  private keys: Phaser.Input.Keyboard.Key[] = [];

  constructor() {
    super('Play');
  }

  init(data: PlayData) {
    this.data_ = data;
    this.acc = 0;
    this.ended = false;
    this.paused = false;
    this.overlay = undefined;
    this.pauseLayer = undefined;
    this.balls = [];
    this.shields = [];
    this.labels = [];
    this.bullets = [];
  }

  create() {
    const seed = (Date.now() & 0xffffff) | 1;
    if (this.data_.mode === 'stage') {
      const st = STAGES[this.data_.stageIndex];
      this.stage = st;
      this.world = new World({
        path: st.path,
        turret: st.turret,
        ranks: app.save.shop,
        seed,
        recipe: buildStageRecipe(st, this.data_.difficulty, st.seed * 31 + seed),
        speed: stageSpeed(st, this.data_.difficulty),
      });
    } else {
      this.stage = undefined;
      this.world = new World({
        path: ENDLESS.path,
        turret: ENDLESS.turret,
        ranks: app.save.shop,
        seed,
        endlessStart: endlessStart(app.save.endless.bestSegment),
      });
    }
    backdrop(this, true);
    this.drawMap();
    this.bodySpine = this.add.graphics().setDepth(1.5);

    for (let i = 0; i < MAX_BALLS; i++) {
      this.balls.push(this.add.image(-100, -100, 'ball-0').setVisible(false).setDepth(2));
      this.shields.push(this.add.image(-100, -100, 'shield').setVisible(false).setDepth(3));
    }
    for (let i = 0; i < MAX_LABELS; i++) {
      this.labels.push(
        this.add
          .text(0, 0, '', {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '15px',
            color: '#ffffff',
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
          .setStroke('#000000', 4)
          .setDepth(5)
          .setVisible(false),
      );
    }
    for (let i = 0; i < MAX_BULLETS; i++)
      this.bullets.push(this.add.image(0, 0, 'bullet').setVisible(false).setDepth(4));
    this.head = this.add.image(0, 0, 'head').setDisplaySize(66, 53).setDepth(4).setVisible(false);
    this.aimLine = this.add.graphics().setDepth(1);
    this.add
      .circle(this.world.turret.x, this.world.turret.y, 50, 0x0d3e32, 0.9)
      .setStrokeStyle(5, 0xe5bc62, 0.9)
      .setDepth(5);
    this.turret = this.add
      .image(this.world.turret.x, this.world.turret.y, 'turret')
      .setDisplaySize(112, 88)
      .setDepth(6);
    this.emitter = this.add.particles(0, 0, 'spark', {
      speed: { min: 80, max: 320 },
      lifespan: 450,
      scale: { start: 1, end: 0 },
      emitting: false,
    });
    this.emitter.setDepth(7);

    this.drawHud();

    // Tap / click sets the aim; dragging keeps updating it.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.aim(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => p.isDown && this.aim(p));
    const kb = this.input.keyboard;
    if (kb) {
      this.keys = [kb.addKey('ONE'), kb.addKey('TWO'), kb.addKey('THREE')];
      kb.on('keydown-ESC', () => this.togglePause());
      kb.on('keydown-P', () => this.togglePause());
    }
    this.events.once('shutdown', () => this.input.keyboard?.removeAllListeners());
    (window as unknown as { __ss?: object }).__ss = { world: this.world, scene: this };
    this.handleEvents();
  }

  private aim(p: Phaser.Input.Pointer) {
    audio.unlock();
    if (this.paused || this.ended || this.world.state !== 'playing' || p.y < HUD_H) return;
    this.world.setAim(p.x, p.y);
  }

  private drawMap() {
    const g = this.add.graphics().setDepth(0);
    const pts = this.world.path.samples(6);
    const stroke = (w: number, color: number, alpha: number) => {
      g.lineStyle(w, color, alpha);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (const p of pts) g.lineTo(p.x, p.y);
      g.strokePath();
    };
    stroke(balance.ball.diameter + 36, 0x0b251f, 0.78);
    stroke(balance.ball.diameter + 30, 0xe2ba67, 1);
    stroke(balance.ball.diameter + 23, 0x554c34, 1);
    stroke(balance.ball.diameter + 17, 0xb4a078, 1);
    stroke(balance.ball.diameter + 3, 0xc8b88b, 1);
    g.lineStyle(2, 0x6c6245, 0.75);
    for (let d = 26; d < this.world.path.length - 20; d += 38) {
      const a = this.world.path.pointAt(d - 4);
      const b = this.world.path.pointAt(d + 4);
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / len;
      const ny = (b.x - a.x) / len;
      const p = this.world.path.pointAt(d);
      g.lineBetween(p.x - nx * 24, p.y - ny * 24, p.x + nx * 24, p.y + ny * 24);
    }
    const end = pts[pts.length - 1];
    const goal = this.stage?.goal.picture ?? ENDLESS.goal.picture;
    this.add.circle(end.x, end.y, 64, 0x0c4438, 0.92).setDepth(0).setStrokeStyle(5, 0xf1c460, 1);
    this.add.circle(end.x, end.y, 54, 0x0b2e28, 0.85).setDepth(0).setStrokeStyle(2, 0x60d5a5, 0.8);
    const goalImage = this.add.image(end.x, end.y, `goal-${goal}`).setDepth(1);
    if (goal === 'hostage') goalImage.setDisplaySize(112, 112);
    else goalImage.setScale(0.85);
  }

  private drawHud() {
    this.add.rectangle(W / 2, HUD_H / 2, W, HUD_H, 0x10282b, 0.96).setDepth(8);
    this.add.rectangle(W / 2, HUD_H, W, 3, COLORS.accent, 0.7).setDepth(8);
    const title =
      this.data_.mode === 'stage'
        ? `${this.stage!.world}-${this.stage!.number - (this.stage!.world - 1) * 10} ${this.data_.difficulty[0].toUpperCase()}${this.data_.difficulty.slice(1)}`
        : 'Endless';
    text(this, 24, 34, title, 28, COLORS.text, { fontStyle: 'bold' }).setOrigin(0, 0.5).setDepth(9);
    this.info = text(this, 24, 78, '', 22, COLORS.dim).setOrigin(0, 0.5).setDepth(9);
    this.meter = this.add.graphics().setDepth(9);
    button(this, W - 60, 55, 84, 72, 'II', () => this.togglePause(), { size: 30 }).setDepth(9);
  }

  update(_t: number, delta: number) {
    if (this.ended) return;
    if (this.world.state === 'choosing') {
      this.keys.forEach((k, i) => Phaser.Input.Keyboard.JustDown(k) && this.pick(i));
    } else if (!this.paused) {
      this.acc = Math.min(this.acc + delta / 1000, 0.1);
      while (this.acc >= STEP && this.world.state === 'playing') {
        this.world.step(STEP);
        this.acc -= STEP;
      }
    }
    this.handleEvents();
    this.render_();
  }

  private handleEvents() {
    const w = this.world;
    const shake = app.save.settings.shake;
    for (const e of w.events) {
      switch (e.t) {
        case 'fire':
          audio.play('shoot');
          break;
        case 'hit':
          audio.play(e.crit ? 'crit' : 'hit');
          if (e.crit) this.floatText(e.x, e.y - 20, `${Math.round(e.dmg)}!`, COLORS.gold);
          break;
        case 'blocked':
          audio.play('blocked');
          break;
        case 'pop': {
          audio.play('pop');
          const tint = e.unit.kind === 'upgrade' ? 0xffd34d : BALL_COLORS[e.unit.index % BALL_COLORS.length];
          this.emitter.setParticleTint(tint);
          this.emitter.explode(e.unit.kind === 'upgrade' ? 30 : 18, e.x, e.y);
          if (shake) this.cameras.main.shake(80, 0.004);
          break;
        }
        case 'upgradeOffered':
          audio.play('upgrade');
          vibrate(30);
          this.showOffer();
          break;
        case 'won':
        case 'lost':
          this.finish(e.t === 'won');
          break;
      }
    }
    w.events.length = 0;
  }

  private render_() {
    const w = this.world;
    const units = w.snake.units;
    this.drawBody();
    // Balls
    let n = 0;
    let label = 0;
    let lastUnit = -1;
    let ballInUnit = 0;
    let shieldN = 0;
    const headIdx = w.snake.headIndex();
    let headDrawn = false;
    for (let k = 0; k < w.ballCount && n < MAX_BALLS; k++) {
      const ui = w.ballUnit[k];
      const u = units[ui];
      ballInUnit = ui === lastUnit ? ballInUnit + 1 : 0;
      lastUnit = ui;
      const x = w.ballX[k];
      const y = w.ballY[k];
      if (ui === headIdx && ballInUnit === 0) {
        // Head sprite on the first ball of the head segment, facing along the path.
        const nx = k + 1 < w.ballCount ? w.ballX[k + 1] : x - 1;
        const ny = k + 1 < w.ballCount ? w.ballY[k + 1] : y;
        this.head
          .setPosition(x, y)
          .setRotation(Math.atan2(y - ny, x - nx))
          .setVisible(true);
        headDrawn = true;
        if (u.shielded && shieldN < MAX_BALLS) this.shields[shieldN++].setPosition(x, y).setVisible(true);
        continue;
      }
      const img = this.balls[n++];
      img.setPosition(x, y).setVisible(true);
      if (u.kind === 'upgrade') img.setTexture('ballUp');
      else if (u.type === 'armored') img.setTexture(`ball-armor-${u.index % BALL_COLORS.length}`);
      else img.setTexture(`ball-${u.index % BALL_COLORS.length}`);
      if (u.shielded && shieldN < MAX_BALLS) this.shields[shieldN++].setPosition(x, y).setVisible(true);
      if (u.kind === 'segment' && ballInUnit === 1 && label < MAX_LABELS) {
        const t = this.labels[label++];
        const hp = String(Math.max(1, Math.ceil(u.hp)));
        if (t.text !== hp) t.setText(hp);
        t.setPosition(x, y).setVisible(true);
      }
    }
    for (let i = n; i < MAX_BALLS && this.balls[i].visible; i++) this.balls[i].setVisible(false);
    for (let i = shieldN; i < MAX_BALLS && this.shields[i].visible; i++) this.shields[i].setVisible(false);
    for (let i = label; i < MAX_LABELS && this.labels[i].visible; i++) this.labels[i].setVisible(false);
    if (!headDrawn) this.head.setVisible(false);

    // Bullets
    let b = 0;
    for (const bl of w.bullets) {
      if (b >= MAX_BULLETS) break;
      this.bullets[b++]
        .setPosition(bl.x, bl.y)
        .setVisible(true)
        .setTint(bl.crit ? 0xffd34d : 0xffffff);
    }
    for (let i = b; i < MAX_BULLETS && this.bullets[i].visible; i++) this.bullets[i].setVisible(false);

    // Turret + aim line
    const t = w.turret;
    this.turret.setRotation(t.angle);
    this.aimLine.clear();
    this.aimLine.lineStyle(3, 0xffffff, 0.18);
    for (let d = 50; d < 300; d += 24) {
      this.aimLine.lineBetween(
        t.x + Math.cos(t.target) * d,
        t.y + Math.sin(t.target) * d,
        t.x + Math.cos(t.target) * (d + 12),
        t.y + Math.sin(t.target) * (d + 12),
      );
    }

    // HUD: danger meter = how far the front is along the path
    const frac = Phaser.Math.Clamp(w.frontDistance() / w.path.length, 0, 1);
    this.meter.clear();
    this.meter.fillStyle(0x375451, 1);
    this.meter.fillRoundedRect(330, 22, 260, 22, 11);
    this.meter.fillStyle(frac > 0.8 ? COLORS.bad : frac > 0.55 ? COLORS.accent : COLORS.good, 1);
    this.meter.fillRoundedRect(330, 22, Math.max(22, 260 * frac), 22, 11);
    const left = w.mode === 'stage' ? `${w.snake.segmentsLeft()} segments left` : `Segment ${w.progress}`;
    const picks = Object.values(w.stacks).reduce((a, v) => a + (v ?? 0), 0);
    this.info.setText(`${left}  ·  ${picks} upgrades`);
  }

  /** The colored targets sit on a continuous scaled body; gaps remain visible after a split. */
  private drawBody() {
    const w = this.world;
    const g = this.bodySpine;
    g.clear();
    const count = Math.min(w.ballCount, MAX_BALLS);
    if (count < 2) return;
    for (const [width, color] of [
      [42, 0x092b22],
      [36, 0xd6ad58],
      [32, 0x117d60],
    ] as const) {
      g.lineStyle(width, color, 1);
      let start = 0;
      while (start < count - 1) {
        let end = start;
        while (
          end + 1 < count &&
          Math.hypot(w.ballX[end + 1] - w.ballX[end], w.ballY[end + 1] - w.ballY[end]) < 48
        )
          end++;
        if (end > start) {
          g.beginPath();
          g.moveTo(w.ballX[start], w.ballY[start]);
          for (let i = start + 1; i <= end; i++) g.lineTo(w.ballX[i], w.ballY[i]);
          g.strokePath();
        }
        start = Math.max(end + 1, start + 1);
      }
    }
    const last = count - 1;
    const dx = w.ballX[last] - w.ballX[last - 1];
    const dy = w.ballY[last] - w.ballY[last - 1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    g.fillStyle(0x0d7359, 1);
    g.fillTriangle(
      w.ballX[last] + nx * 15,
      w.ballY[last] + ny * 15,
      w.ballX[last] - nx * 15,
      w.ballY[last] - ny * 15,
      w.ballX[last] + (dx / len) * 28,
      w.ballY[last] + (dy / len) * 28,
    );
  }

  private floatText(x: number, y: number, s: string, color: string) {
    const t = text(this, x, y, s, 24, color, { fontStyle: 'bold' }).setDepth(8).setStroke('#000', 4);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 600, onComplete: () => t.destroy() });
  }

  private showOffer() {
    this.overlay?.destroy();
    const w = this.world;
    const layer = this.add.container(0, 0).setDepth(20);
    layer.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.65).setInteractive());
    layer.add(text(this, W / 2, 300, 'Choose an upgrade', 42, COLORS.gold, { fontStyle: 'bold' }));
    w.offer.forEach((id, i) => {
      const def = RUN_UPGRADE_BY_ID[id];
      const stack = w.stacks[id] ?? 0;
      const y = 470 + i * 210;
      const card = this.add.container(W / 2, y);
      const bg = panel(this, 0, 0, 620, 180, COLORS.panelHi);
      card.add(bg);
      card.add(text(this, -280, -45, `${i + 1}`, 26, COLORS.dim).setOrigin(0, 0.5));
      card.add(text(this, 0, -45, def.name, 36, COLORS.text, { fontStyle: 'bold' }));
      card.add(text(this, 0, 10, describeUpgrade(id), 26, COLORS.text));
      card.add(text(this, 0, 55, `Level ${stack} → ${stack + 1} (max ${def.max})`, 22, COLORS.dim));
      card.setSize(620, 180).setInteractive({ useHandCursor: true });
      card.on('pointerup', () => this.pick(i));
      layer.add(card);
    });
    this.overlay = layer;
  }

  private pick(i: number) {
    if (this.world.state !== 'choosing') return;
    this.world.choose(i);
    audio.play('click');
    this.overlay?.destroy();
    this.overlay = undefined;
    this.handleEvents();
  }

  private togglePause() {
    if (this.ended) return;
    if (this.pauseLayer) {
      this.pauseLayer.destroy();
      this.pauseLayer = undefined;
      this.paused = false;
      return;
    }
    this.paused = true;
    const layer = this.add.container(0, 0).setDepth(30);
    layer.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setInteractive());
    layer.add(text(this, W / 2, 420, 'Paused', 56, COLORS.text, { fontStyle: 'bold' }));
    layer.add(button(this, W / 2, 560, 420, 90, 'Resume', () => this.togglePause(), { color: 0x4a3f78 }));
    layer.add(button(this, W / 2, 680, 420, 90, 'Give up', () => this.finish(false)));
    layer.add(button(this, W / 2, 800, 420, 90, 'Quit (no gold)', () => this.scene.start('Title')));
    this.pauseLayer = layer;
  }

  private finish(won: boolean) {
    if (this.ended) return;
    this.ended = true;
    audio.play(won ? 'win' : 'lose');
    vibrate(won ? 60 : 200);
    const w = this.world;
    const result = {
      mode: this.data_.mode,
      won,
      destroyedHp: w.destroyed.map((d) => d.maxHp),
      destroyed: w.destroyed.length,
      progress: w.progress,
      time: Math.round(w.time),
      ...(this.data_.mode === 'stage'
        ? { stageIndex: this.data_.stageIndex, difficulty: this.data_.difficulty }
        : {}),
    };
    this.time.delayedCall(won ? 900 : 1200, () => this.scene.start('Result', result));
  }
}
