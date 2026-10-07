// Every sound in the game, synthesised with Web Audio so there are no files
// to load. Times are in seconds from "now".

const VOLUME = 0.5;
const ROLLING = 0.6;
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;
const E6 = 1318.5;
const G6 = 1567.98;

// Pass `context` to render into a given AudioContext (used to measure the
// sounds); otherwise one is created on the first sound, which must follow a
// tap or key press for the browser to allow it.
export function createSound({ context = null, muted = false } = {}) {
  let ctx = context;
  let master = null;
  let noise = null;
  let rolling = null;
  let building = null;

  function ready() {
    if (muted) return false;
    if (!ctx) {
      const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!AudioContextClass) return false;
      ctx = new AudioContextClass();
    }
    if (!master) {
      master = ctx.createGain();
      master.gain.value = VOLUME;
      master.connect(ctx.destination);
    }
    // Resuming fails harmlessly on a context that cannot be resumed.
    if (ctx.state === 'suspended') ctx.resume?.().catch(() => {});
    return true;
  }

  // A pitched note with a quick attack and a fade to silence.
  function tone({ type = 'sine', from, to = from, at = 0, length, gain = 0.3, into = master }) {
    const start = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + length);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(amp).connect(into);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }

  function noiseBuffer() {
    if (!noise) {
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return noise;
  }

  // A short burst of filtered noise: clicks, thunks, and clatter.
  function burst({ at = 0, length, gain, type, freq }) {
    const start = ctx.currentTime + at;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    source.buffer = noiseBuffer();
    filter.type = type;
    filter.frequency.value = freq;
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + length);
    source.connect(filter).connect(amp).connect(master);
    source.start(start, Math.random() * 0.5, length + 0.02);
  }

  // A bright bell-like ping, as a coin landing.
  function ping(at, freq, gain = 0.1) {
    tone({ type: 'sine', from: freq, at, length: 0.09, gain });
    tone({ type: 'sine', from: freq * 2.4, at, length: 0.05, gain: gain * 0.5 });
  }

  function coinShower(from, length, count) {
    for (let i = 0; i < count; i++) ping(from + Math.random() * length, 2200 + Math.random() * 2200, 0.07);
  }

  // A short melody: `notes` is [frequency, at, length] per note.
  function melody(notes, gain) {
    for (const [freq, at, length] of notes) {
      tone({ type: 'triangle', from: freq, at, length, gain });
      tone({ type: 'sine', from: freq * 2, at, length: length * 0.7, gain: gain * 0.35 });
    }
  }

  function fadeOut(node, amp, over = 0.08) {
    const now = ctx.currentTime;
    amp.gain.cancelScheduledValues(now);
    amp.gain.setValueAtTime(Math.max(amp.gain.value, 0.0001), now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + over);
    for (const n of [].concat(node)) n.stop(now + over + 0.02);
  }

  return {
    get muted() {
      return muted;
    },
    setMuted(value) {
      muted = value;
      if (muted) {
        this.reelsEnd();
        this.buildEnd();
      }
    },

    // The SPIN button going down.
    press() {
      if (!ready()) return;
      burst({ length: 0.03, gain: 0.3, type: 'highpass', freq: 2500 });
      tone({ from: 220, to: 95, length: 0.09, gain: 0.45 });
    },

    // A light click for the smaller controls.
    tick() {
      if (!ready()) return;
      tone({ type: 'square', from: 1300, length: 0.025, gain: 0.12 });
    },

    // The reels rolling: a fast mechanical clatter that loops until reelsEnd.
    reelsStart() {
      if (!ready() || rolling) return;
      const rate = 22;
      const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate / 2), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      const step = ctx.sampleRate / rate;
      for (let i = 0; i < data.length; i++) {
        const sinceTick = i % step;
        data[i] = (Math.random() * 2 - 1) * Math.exp(-sinceTick / (ctx.sampleRate * 0.004));
      }
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const amp = ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      filter.type = 'bandpass';
      filter.frequency.value = 1700;
      filter.Q.value = 1.1;
      amp.gain.value = ROLLING;
      source.connect(filter).connect(amp).connect(master);
      source.start();
      rolling = { source, amp, left: 3 };
    },

    // One reel landing. `reel` is 0, 1, or 2; each lands a little higher.
    reelStop(reel) {
      if (!ready()) return;
      tone({ from: 150 + reel * 22, to: 58, length: 0.14, gain: 0.6 });
      burst({ length: 0.06, gain: 0.35, type: 'lowpass', freq: 900 });
      if (rolling) {
        rolling.left -= 1;
        if (rolling.left <= 0) this.reelsEnd();
        else rolling.amp.gain.setTargetAtTime(ROLLING * (rolling.left / 3), ctx.currentTime, 0.03);
      }
    },

    reelsEnd() {
      if (!rolling) return;
      fadeOut(rolling.source, rolling.amp, 0.05);
      rolling = null;
    },

    // The last reel hanging: a rising, wavering note that runs until buildEnd.
    buildStart(length) {
      if (!ready() || building) return;
      const now = ctx.currentTime;
      const amp = ctx.createGain();
      const wobble = ctx.createOscillator();
      const depth = ctx.createGain();
      amp.gain.setValueAtTime(0.0001, now);
      amp.gain.exponentialRampToValueAtTime(0.16, now + length);
      wobble.frequency.setValueAtTime(7, now);
      wobble.frequency.linearRampToValueAtTime(16, now + length);
      depth.gain.value = 0.06;
      wobble.connect(depth).connect(amp.gain);
      amp.connect(master);
      const voices = [1, 1.5].map((ratio) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(196 * ratio, now);
        osc.frequency.exponentialRampToValueAtTime(587 * ratio, now + length);
        osc.connect(amp);
        osc.start(now);
        return osc;
      });
      wobble.start(now);
      building = { nodes: [...voices, wobble], amp };
    },

    buildEnd() {
      if (!building) return;
      fadeOut(building.nodes, building.amp);
      building = null;
    },

    // Less than the wager back: two quick notes.
    smallWin() {
      if (!ready()) return;
      melody([[E5, 0, 0.1], [G5, 0.09, 0.16]], 0.3);
    },

    // The wager back or more: a rising run with coins dropping.
    win() {
      if (!ready()) return;
      melody([[C5, 0, 0.12], [E5, 0.1, 0.12], [G5, 0.2, 0.12], [C6, 0.3, 0.45]], 0.4);
      coinShower(0.35, 0.5, 9);
    },

    // A big win: a fanfare, a held chord, and a long shower of coins.
    bigWin() {
      if (!ready()) return;
      melody([[C5, 0, 0.11], [C5, 0.12, 0.11], [C5, 0.24, 0.11], [E5, 0.36, 0.16], [G5, 0.54, 0.16], [C6, 0.72, 1.1], [E6, 0.72, 1.1], [G6, 0.72, 1.1]], 0.34);
      tone({ type: 'sawtooth', from: C5 / 2, at: 0.72, length: 1.1, gain: 0.1 });
      melody([[G5, 1.9, 0.12], [C6, 2.02, 0.12], [E6, 2.14, 0.5]], 0.3);
      coinShower(0.7, 2.0, 46);
    },

    // Free tokens arriving.
    refill() {
      if (!ready()) return;
      melody([392, C5, E5, G5, C6].map((freq, i) => [freq, i * 0.07, i === 4 ? 0.3 : 0.09]), 0.32);
      coinShower(0.3, 0.4, 8);
    },
  };
}
