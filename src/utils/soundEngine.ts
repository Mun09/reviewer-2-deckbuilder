// Procedural WebAudio API Synthesizer for Reviewer 2 (Zero external audio file failures)

class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;
  private bgmInterval: number | null = null;
  private isBgmPlaying: boolean = false;

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopAmbience();
    }
    return this.muted;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.muted) {
      this.stopAmbience();
    }
  }

  public playCardPlay() {
    this.playCardDraw();
  }

  public playShieldGain() {
    this.playShieldBlock();
  }

  public playNormalAttack() {
    this.playAttackStrike(false);
  }

  public playCriticalAttack() {
    this.playAttackStrike(true);
  }

  public playBossAttackHit() {
    this.playBossAttack();
  }

  public playHallucinationDiscarded() {
    this.playVerifierReject();
  }

  public playVerifiedLock() {
    this.playVerifierPass();
  }

  public playVictoryFanfare() {
    this.playVictoryAccept();
  }

  public playDefeatGong() {
    this.playDefeatReject();
  }

  public playCardHover() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.045);

    gain.gain.setValueAtTime(0.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.055);
  }

  public playCardDraw() {
    const ctx = this.getContext();
    if (!ctx) return;

    // Crisp parchment rustle / whoosh using filtered noise + soft tone
    const bufferSize = ctx.sampleRate * 0.09;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2600, ctx.currentTime + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.09);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }

  public playEvidenceLock() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);

      gain.gain.setValueAtTime(0.08, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.3);
    });
  }

  public playShieldBlock() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc2.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.14);
    osc2.frequency.setValueAtTime(330, now);
    osc2.frequency.exponentialRampToValueAtTime(660, now + 0.18);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.26);
    osc2.stop(now + 0.26);
  }

  public playAttackStrike(isCritical: boolean = false) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Impact punch
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isCritical ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(isCritical ? 310 : 190, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + (isCritical ? 0.35 : 0.22));

    gain.gain.setValueAtTime(isCritical ? 0.22 : 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isCritical ? 0.36 : 0.24));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);

    if (isCritical) {
      // High harmonic chime for CRITICAL COUNTER-CITATION
      [880, 1174.66, 1760].forEach((f, i) => {
        const chime = ctx.createOscillator();
        const cGain = ctx.createGain();
        chime.type = 'triangle';
        chime.frequency.setValueAtTime(f, now + i * 0.04);
        cGain.gain.setValueAtTime(0.11, now + i * 0.04);
        cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        chime.connect(cGain);
        cGain.connect(ctx.destination);
        chime.start(now + i * 0.04);
        chime.stop(now + 0.46);
      });
    }
  }

  public playBossAttack() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.42);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  public playVerifierReject() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.setValueAtTime(180, now + 0.07);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playVerifierPass() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880, now + 0.06);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playVictoryAccept() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const chord = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99];
    chord.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.08);
      gain.gain.setValueAtTime(0.1, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 1.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 1.15);
    });
  }

  public playDefeatReject() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [220, 207.65, 196.0, 146.83];
    notes.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now + idx * 0.22);
      gain.gain.setValueAtTime(0.09, now + idx * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.22 + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.22);
      osc.stop(now + idx * 0.22 + 0.6);
    });
  }

  public startAmbience() {
    if (this.muted || this.isBgmPlaying) return;
    const ctx = this.getContext();
    if (!ctx) return;
    this.isBgmPlaying = true;

    const playDronePulse = () => {
      if (this.muted || !this.isBgmPlaying) return;
      const c = this.getContext();
      if (!c) return;
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      // Dark Dorian / Phrygian low cathedral pedal note
      const roots = [55.0, 61.74, 65.41, 49.0];
      const freq = roots[Math.floor(Math.random() * roots.length)];
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.025, now + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 3.8);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now);
      osc.stop(now + 3.9);
    };

    playDronePulse();
    this.bgmInterval = window.setInterval(playDronePulse, 4000);
  }

  public playCutsceneCharge() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc2.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.85);
    osc2.frequency.setValueAtTime(210, now);
    osc2.frequency.exponentialRampToValueAtTime(1320, now + 0.85);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.92);
    osc2.stop(now + 0.92);
  }

  public playCutsceneImpact() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Heavy sub-bass drop + crystalline shatter chord
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(280, now);
    sub.frequency.exponentialRampToValueAtTime(32, now + 0.55);
    subGain.gain.setValueAtTime(0.28, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.6);

    [587.33, 880, 1174.66, 1760].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(freq, now + i * 0.03);
      g.gain.setValueAtTime(0.11, now + i * 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now + i * 0.03);
      o.stop(now + 0.78);
    });
  }

  public playBossUltimateCutscene() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Ominous cathedral brass/organ doom chord
    [73.42, 110.0, 146.83, 155.56, 220.0].forEach((freq) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(freq, now);
      o.frequency.linearRampToValueAtTime(freq * 0.97, now + 1.1);
      g.gain.setValueAtTime(0.01, now);
      g.gain.linearRampToValueAtTime(0.06, now + 0.25);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now);
      o.stop(now + 1.3);
    });
  }

  public stopAmbience() {
    this.isBgmPlaying = false;
    if (this.bgmInterval !== null) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const soundEngine = new SoundEngine();
