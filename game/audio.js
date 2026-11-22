// audio.js — every sound in Lantern Thief is synthesised with WebAudio at
// the moment it is needed: a soft step, a gem's chime, a pebble's tick, the
// alarm's blip. No audio files, nothing to load, nothing over the network.
// The bank stays silent until the player's first click or keypress creates
// the context, which is what browsers require anyway.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
  }

  // Create (or resume) the context from a user gesture. Safe to call often.
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null; // no audio on this machine: the game plays on silently
    }
  }

  // One short enveloped tone. Nothing plays before unlock().
  tone(freq, seconds, { type = 'sine', gain = 0.2, slideTo = null, delay = 0 } = {}) {
    if (!this.ctx || !this.master) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const amp = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + seconds);
      amp.gain.setValueAtTime(0.0001, t0);
      amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
      osc.connect(amp).connect(this.master);
      osc.start(t0);
      osc.stop(t0 + seconds + 0.05);
    } catch {
      /* a failed blip never stops the game */
    }
  }

  step(sneaking) {
    // A muffled footfall: low, brief, quieter still when sneaking.
    this.tone(sneaking ? 82 : 96, 0.07, { type: 'triangle', gain: sneaking ? 0.05 : 0.1 });
  }

  chime() {
    // A gem leaves its cushion: two bright notes, the second a fifth up.
    this.tone(1318, 0.16, { type: 'sine', gain: 0.22 });
    this.tone(1975, 0.24, { type: 'sine', gain: 0.18, delay: 0.07 });
  }

  pebbleTick() {
    this.tone(2400, 0.05, { type: 'square', gain: 0.08 });
    this.tone(1700, 0.06, { type: 'square', gain: 0.06, delay: 0.06 });
  }

  alarmBlip() {
    this.tone(620, 0.11, { type: 'sawtooth', gain: 0.1, slideTo: 880 });
  }

  caughtSting() {
    this.tone(392, 0.3, { type: 'sawtooth', gain: 0.16 });
    this.tone(311, 0.42, { type: 'sawtooth', gain: 0.16, delay: 0.14 });
    this.tone(233, 0.6, { type: 'sawtooth', gain: 0.16, delay: 0.3 });
  }

  winChime() {
    this.tone(1046, 0.18, { type: 'sine', gain: 0.2 });
    this.tone(1318, 0.18, { type: 'sine', gain: 0.2, delay: 0.12 });
    this.tone(1568, 0.34, { type: 'sine', gain: 0.22, delay: 0.24 });
  }
}
