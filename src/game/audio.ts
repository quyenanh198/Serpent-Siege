/** Small WebAudio synth: all sounds and music are generated in code (no audio files). */
export type Sfx = 'click' | 'shoot' | 'hit' | 'crit' | 'pop' | 'upgrade' | 'win' | 'lose' | 'blocked';

class Audio {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxVol = 0.8;
  private musicVol = 0.5;
  private musicTimer = 0;
  private lastShoot = 0;
  private step = 0;

  /** Call from a user gesture (browsers block audio until then). */
  unlock(): void {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain.connect(this.ctx.destination);
      this.musicGain.connect(this.ctx.destination);
      this.setVolumes(this.sfxVol, this.musicVol);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setVolumes(sfx: number, music: number): void {
    this.sfxVol = sfx;
    this.musicVol = music;
    if (this.sfxGain) this.sfxGain.gain.value = sfx * 0.5;
    if (this.musicGain) this.musicGain.gain.value = music * 0.12;
  }

  play(name: Sfx): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || this.sfxVol <= 0) return;
    const t = ctx.currentTime;
    switch (name) {
      case 'click':
        this.tone(660, 0.05, 'square', 0.15, t);
        break;
      case 'shoot':
        if (t - this.lastShoot < 0.06) return;
        this.lastShoot = t;
        this.tone(880, 0.03, 'triangle', 0.05, t, 600);
        break;
      case 'hit':
        this.tone(320, 0.04, 'triangle', 0.08, t, 240);
        break;
      case 'crit':
        this.tone(1200, 0.08, 'square', 0.12, t, 1800);
        break;
      case 'blocked':
        this.tone(140, 0.05, 'sawtooth', 0.08, t);
        break;
      case 'pop':
        this.noise(0.12, 0.35, t);
        this.tone(520, 0.12, 'sine', 0.25, t, 1040);
        break;
      case 'upgrade':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.25, t + i * 0.07));
        break;
      case 'win':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.3, t + i * 0.1));
        break;
      case 'lose':
        [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.25, 'sawtooth', 0.15, t + i * 0.15));
        break;
    }
  }

  startMusic(): void {
    if (!this.ctx || this.musicTimer) return;
    // A gentle pentatonic arpeggio, scheduled a bar at a time.
    const notes = [220, 262, 294, 330, 392, 440, 392, 330];
    const bass = [110, 110, 147, 131];
    const tick = () => {
      const ctx = this.ctx!;
      const t = ctx.currentTime + 0.05;
      for (let i = 0; i < 8; i++) {
        const n = notes[(i + this.step * 3) % notes.length];
        this.tone(n, 0.22, 'triangle', 0.5, t + i * 0.25, undefined, this.musicGain!);
      }
      this.tone(bass[this.step % bass.length], 1.9, 'sine', 0.8, t, undefined, this.musicGain!);
      this.step++;
    };
    tick();
    this.musicTimer = window.setInterval(tick, 2000);
  }

  stopMusic(): void {
    window.clearInterval(this.musicTimer);
    this.musicTimer = 0;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    t: number,
    endFreq?: number,
    out: AudioNode = this.sfxGain!,
  ): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, t: number): void {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.value = vol;
    src.buffer = buf;
    src.connect(g).connect(this.sfxGain!);
    src.start(t);
  }
}

export const audio = new Audio();
