import balance from './data/balance.json';
import { EndlessRecipe, endlessSpeed } from './difficulty';
import { Path } from './path';
import { Rng } from './rng';
import { offerUpgrades, type RunStacks, type RunUpgradeId } from './runUpgrades';
import { Snake, type Unit } from './snake';
import { computeStats, type ShooterStats, type ShopRanks } from './stats';
import type { UnitSpec } from './types';

export const STEP = 1 / 60;

export type SimEvent =
  | { t: 'fire'; x: number; y: number; angle: number }
  | { t: 'hit'; x: number; y: number; dmg: number; crit: boolean; unitId: number }
  | { t: 'blocked'; x: number; y: number }
  | { t: 'pop'; unit: Unit; x: number; y: number }
  | { t: 'headChanged'; unitId: number }
  | { t: 'upgradeOffered'; options: RunUpgradeId[] }
  | { t: 'upgradeChosen'; id: RunUpgradeId }
  | { t: 'won' }
  | { t: 'lost' };

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  crit: boolean;
  chain: boolean;
  pierceLeft: number;
  bounceLeft: number;
  lastHit: number;
}

export interface WorldOptions {
  path: [number, number][];
  turret: [number, number];
  ranks: ShopRanks;
  seed: number;
  /** Stage mode: the full unit list and a fixed speed. */
  recipe?: UnitSpec[];
  speed?: number;
  /** Endless mode: the segment index the run starts at. */
  endlessStart?: number;
}

export type WorldState = 'playing' | 'choosing' | 'won' | 'lost';

/** Deterministic game world. No engine or DOM; advance with step() at a fixed 60 Hz. */
export class World {
  readonly path: Path;
  readonly snake: Snake;
  readonly turret: { x: number; y: number; angle: number; target: number };
  readonly bullets: Bullet[] = [];
  readonly events: SimEvent[] = [];
  readonly destroyed: { index: number; maxHp: number }[] = [];
  readonly mode: 'stage' | 'endless';
  state: WorldState = 'playing';
  stacks: RunStacks = {};
  stats: ShooterStats;
  offer: RunUpgradeId[] = [];
  time = 0;
  /** Endless: highest segment index reached (popped) + 1. Stage: segments destroyed. */
  progress = 0;

  /** Ball positions for this step (flat arrays, rebuilt each step). */
  ballX = new Float64Array(512);
  ballY = new Float64Array(512);
  ballUnit = new Int32Array(512);
  ballCount = 0;

  private readonly rng: Rng;
  private readonly ranks: ShopRanks;
  private readonly speed: number;
  private readonly endless?: EndlessRecipe;
  private nextEndlessIndex = 0;
  private pendingOffers = 0;
  private fireTimer = 0;
  private shots = 0;
  private slowTimer = 0;
  private introDone = false;
  private headId = -1;
  private readonly tmp = { x: 0, y: 0 };

  constructor(opts: WorldOptions) {
    this.path = new Path(opts.path);
    this.snake = new Snake(balance.ball.diameter);
    this.rng = new Rng(opts.seed);
    this.ranks = opts.ranks;
    this.turret = { x: opts.turret[0], y: opts.turret[1], angle: -Math.PI / 2, target: -Math.PI / 2 };
    if (opts.recipe) {
      this.mode = 'stage';
      this.speed = opts.speed ?? 40;
      for (const spec of opts.recipe) this.snake.push(spec);
    } else {
      this.mode = 'endless';
      this.speed = 0;
      this.endless = new EndlessRecipe(opts.seed);
      const start = opts.endlessStart ?? 0;
      // Skipped upgrade balls are granted as picks at the start (08 §4b-endless).
      for (let i = 0; i < start; i++) {
        this.pendingOffers += this.endless.unitsFor(i).filter((u) => u.kind === 'upgrade').length;
      }
      this.nextEndlessIndex = start;
      this.progress = start;
      this.fillEndless();
    }
    this.stats = computeStats(this.ranks, this.stacks);
    this.headId = this.snake.units[this.snake.headIndex()]?.id ?? -1;
    this.layoutBalls();
    if (this.pendingOffers > 0) this.nextOffer();
  }

  setAim(x: number, y: number): void {
    const dx = x - this.turret.x;
    const dy = y - this.turret.y;
    if (dx * dx + dy * dy < 1) return;
    this.turret.target = Math.atan2(dy, dx);
  }

  choose(i: number): void {
    if (this.state !== 'choosing') return;
    const id = this.offer[i];
    if (!id) return;
    this.stacks[id] = (this.stacks[id] ?? 0) + 1;
    if (id === 'rewind') this.snake.headPos -= this.path.length * 0.15;
    this.stats = computeStats(this.ranks, this.stacks);
    this.events.push({ t: 'upgradeChosen', id });
    this.offer = [];
    this.state = 'playing';
    if (this.pendingOffers > 0) this.nextOffer();
  }

  currentSpeed(): number {
    const base = this.mode === 'stage' ? this.speed : endlessSpeed(this.progress);
    // Rush in at the start, and whenever pops have pushed the whole snake off the path.
    const intro = this.introDone && this.snake.headPos > 0 ? 1 : balance.snake.introSpeedMult;
    const slow = this.slowTimer > 0 ? 1 - Math.min(0.6, this.stats.frost) : 1;
    return base * intro * slow;
  }

  step(dt = STEP): void {
    if (this.state !== 'playing') return;
    this.time += dt;
    if (!this.introDone && this.snake.headPos >= this.path.length * balance.snake.introUntil)
      this.introDone = true;
    this.snake.advance(this.currentSpeed() * dt);
    if (this.slowTimer > 0) this.slowTimer -= dt;
    this.snake.stepOffsets(dt);
    if (this.endless) this.fillEndless();
    this.turnTurret(dt);
    this.layoutBalls();

    this.fireTimer += dt;
    const interval = 1 / this.stats.fireRate;
    while (this.fireTimer >= interval - 1e-9 && this.state === 'playing') {
      this.fireTimer -= interval;
      this.fire();
    }
    this.stepBullets(dt);

    if (this.state !== 'playing' && this.state !== 'choosing') return;
    if (this.mode === 'stage' && this.snake.segmentsLeft() === 0) {
      this.state = 'won';
      this.events.push({ t: 'won' });
    } else if (this.snake.headPos >= this.path.length) {
      this.state = 'lost';
      this.events.push({ t: 'lost' });
    }
  }

  /** Arc distance of the front ball (base position). */
  frontDistance(): number {
    return this.snake.headPos;
  }

  /** Simple state hash for determinism tests. */
  hash(): number {
    let h = 2166136261;
    const mix = (v: number) => {
      h = Math.imul(h ^ (Math.round(v * 1000) | 0), 16777619);
    };
    mix(this.snake.headPos);
    mix(this.rng.state());
    mix(this.bullets.length);
    mix(this.progress);
    for (const u of this.snake.units) mix(u.hp + u.id * 7);
    return h >>> 0;
  }

  private nextOffer(): void {
    if (this.pendingOffers > 0) this.pendingOffers--;
    const offer = offerUpgrades(this.stacks, this.rng);
    if (offer.length === 0) return;
    this.offer = offer;
    this.state = 'choosing';
    this.events.push({ t: 'upgradeOffered', options: offer });
  }

  private fillEndless(): void {
    const e = this.endless!;
    const min = balance.endless.minQueued;
    while (this.snake.segmentsLeft() < min) {
      for (const spec of e.unitsFor(this.nextEndlessIndex)) this.snake.push(spec);
      this.nextEndlessIndex++;
    }
  }

  private turnTurret(dt: number): void {
    const t = this.turret;
    let diff = t.target - t.angle;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    const max = balance.turret.turnSpeed * dt;
    t.angle += Math.abs(diff) <= max ? diff : Math.sign(diff) * max;
  }

  /** Visible ball positions: balls with distance < 0 are still off the path and cannot be hit. */
  layoutBalls(): void {
    const D = this.snake.ballD;
    let n = 0;
    let d = this.snake.headPos;
    const units = this.snake.units;
    for (let ui = 0; ui < units.length; ui++) {
      const u = units[ui];
      for (let k = 0; k < u.balls; k++) {
        const bd = d - k * D + u.offset;
        if (bd >= 0 && bd <= this.path.length) {
          if (n >= this.ballX.length) this.growBalls();
          this.path.pointAt(bd, this.tmp);
          this.ballX[n] = this.tmp.x;
          this.ballY[n] = this.tmp.y;
          this.ballUnit[n] = ui;
          n++;
        }
      }
      d -= u.balls * D;
      if (d + D < 0 && u.offset <= 0) break;
    }
    this.ballCount = n;
  }

  private growBalls(): void {
    const size = this.ballX.length * 2;
    const x = new Float64Array(size);
    const y = new Float64Array(size);
    const u = new Int32Array(size);
    x.set(this.ballX);
    y.set(this.ballY);
    u.set(this.ballUnit);
    this.ballX = x;
    this.ballY = y;
    this.ballUnit = u;
  }

  private fire(): void {
    this.shots++;
    const s = this.stats;
    const chain = s.chain > 0 && this.shots % 5 === 0;
    const spread = (balance.bullet.spreadDeg * Math.PI) / 180;
    const t = this.turret;
    for (let k = 0; k < s.bullets; k++) {
      const a = t.angle + (k - (s.bullets - 1) / 2) * spread;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      this.bullets.push({
        x: t.x + cos * 36,
        y: t.y + sin * 36,
        vx: cos * balance.bullet.speed,
        vy: sin * balance.bullet.speed,
        crit: this.rng.next() < s.critChance,
        chain,
        pierceLeft: s.pierce,
        bounceLeft: s.ricochet,
        lastHit: -1,
      });
    }
    this.events.push({ t: 'fire', x: t.x, y: t.y, angle: t.angle });
  }

  private stepBullets(dt: number): void {
    const W = balance.view.width;
    const H = balance.view.height;
    const r = balance.bullet.radius + this.snake.ballD / 2;
    const r2 = r * r;
    const sub = 2;
    const h = dt / sub;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      if (this.state !== 'playing') return;
      const b = this.bullets[i];
      let alive = true;
      for (let s = 0; s < sub && alive; s++) {
        b.x += b.vx * h;
        b.y += b.vy * h;
        if (b.x < 0 || b.x > W || b.y < 0 || b.y > H) {
          if (b.bounceLeft <= 0) {
            alive = false;
            break;
          }
          b.bounceLeft--;
          if (b.x < 0 || b.x > W) b.vx = -b.vx;
          if (b.y < 0 || b.y > H) b.vy = -b.vy;
          b.x = Math.max(0, Math.min(W, b.x));
          b.y = Math.max(0, Math.min(H, b.y));
          b.lastHit = -1;
        }
        for (let k = 0; k < this.ballCount; k++) {
          const dx = this.ballX[k] - b.x;
          const dy = this.ballY[k] - b.y;
          if (dx * dx + dy * dy > r2) continue;
          const ui = this.ballUnit[k];
          const id = this.snake.units[ui].id;
          if (id === b.lastHit) continue;
          if (b.pierceLeft > 0) {
            b.pierceLeft--;
            b.lastHit = id;
          } else {
            alive = false;
          }
          this.hitUnit(ui, b, this.ballX[k], this.ballY[k]);
          break;
        }
      }
      if (!alive) {
        this.bullets[i] = this.bullets[this.bullets.length - 1];
        this.bullets.pop();
      }
    }
  }

  private hitUnit(ui: number, b: Bullet, x: number, y: number): void {
    const s = this.stats;
    let dmg = s.damage * (b.crit ? s.critDamage : 1);
    if (ui === this.snake.headIndex()) dmg *= 1 + s.headBonus;
    this.damage(ui, dmg, b.crit, x, y);
    if (s.splash > 0) {
      const next = this.nextSegment(ui);
      if (next >= 0) this.damage(next, dmg * s.splash, false, x, y);
    }
    if (b.chain) {
      let j = ui;
      for (let c = 0; c < s.chain; c++) {
        j = this.nextSegment(j);
        if (j < 0) break;
        this.damage(j, dmg, b.crit, x, y);
      }
    }
    if (s.frost > 0) this.slowTimer = 2;
    this.resolvePops();
  }

  private nextSegment(ui: number): number {
    const units = this.snake.units;
    for (let j = ui + 1; j < units.length; j++) if (units[j].kind === 'segment') return j;
    return -1;
  }

  private damage(ui: number, dmg: number, crit: boolean, x: number, y: number): void {
    const u = this.snake.units[ui];
    if (u.shielded && ui === 0) u.shielded = false;
    if (u.shielded) {
      this.events.push({ t: 'blocked', x, y });
      return;
    }
    if (u.type === 'armored') dmg = Math.max(1, dmg - balance.segmentTypes.armoredReduction);
    u.hp -= dmg;
    this.events.push({ t: 'hit', x, y, dmg, crit, unitId: u.id });
  }

  private resolvePops(): void {
    const units = this.snake.units;
    let offered = 0;
    for (let i = units.length - 1; i >= 0; i--) {
      const u = units[i];
      if (u.hp > 0) continue;
      const mid = this.snake.basePos(i) + u.offset - ((u.balls - 1) * this.snake.ballD) / 2;
      const pos = this.path.pointAt(mid);
      this.snake.pop(i, balance.snake.gapCloseTime);
      // A shielded segment loses its shield when the unit in front of it pops.
      if (i < units.length) units[i].shielded = false;
      this.events.push({ t: 'pop', unit: u, x: pos.x, y: pos.y });
      if (u.kind === 'segment') {
        this.destroyed.push({ index: u.index, maxHp: u.maxHp });
        this.progress =
          this.mode === 'endless' ? Math.max(this.progress, u.index + 1) : this.destroyed.length;
      } else {
        offered++;
      }
    }
    const head = this.snake.units[this.snake.headIndex()]?.id ?? -1;
    if (head !== this.headId) {
      this.headId = head;
      if (head >= 0) this.events.push({ t: 'headChanged', unitId: head });
    }
    this.layoutBalls();
    if (offered > 0) {
      this.pendingOffers += offered;
      if (this.state === 'playing') this.nextOffer();
    }
  }
}
