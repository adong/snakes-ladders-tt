/* TT Snakes & Ladders: the game's own sounds, built on Kit.sound.tone / hiss (all synthesised, no files).
   SL.sfx.kit(name, ...args) plays a kit effect; the rest are ours. Every call is a silent no-op until
   Kit.sound.init() has run from the first tap, and Kit.sound's mute silences them all. */
(function () {
  'use strict';
  const SL = (window.SL = window.SL || {});
  const S = Kit.sound;
  const tone = (o) => S.tone(o);
  const hiss = (o) => S.hiss(o);
  // the counting notes: do re mi fa so la (one per hop, so a 4 sounds do re mi fa)
  const SCALE = [523, 587, 659, 698, 784, 880, 988, 1047];

  const sfx = {
    kit(name, ...args) {
      if (S[name]) S[name](...args);
    },
    // the die tumbles: a rattle of little clacks
    roll() {
      for (let i = 0; i < 7; i++) {
        const at = i * 0.07 + Math.random() * 0.03;
        tone({ type: 'square', f: 900 + Math.random() * 700, dur: 0.03, vol: 0.05, at, lp: 3000 });
        hiss({ filter: 'bandpass', f: 2600, q: 2, dur: 0.03, vol: 0.06, at });
      }
    },
    // the die lands: a woody knock
    dieLand() {
      tone({ type: 'triangle', f: 330, to: 200, dur: 0.12, vol: 0.18 });
      hiss({ filter: 'lowpass', f: 1800, to: 400, dur: 0.08, vol: 0.1 });
    },
    // a hop to the next square: the next counting note (n = 1, 2, 3...)
    hop(n = 1) {
      const f = SCALE[(Math.max(1, n) - 1) % SCALE.length];
      tone({ type: 'triangle', f, dur: 0.16, vol: 0.13 });
      tone({ type: 'sine', f: f * 2, dur: 0.08, vol: 0.04 });
    },
    // up the ladder: quick notes climbing
    climb(steps = 8) {
      for (let i = 0; i < steps; i++) tone({ type: 'square', f: 392 * Math.pow(2, i / 7), at: i * 0.09, dur: 0.07, vol: 0.05, lp: 2600 });
      [784, 988, 1175].forEach((f, i) => tone({ type: 'triangle', f, at: steps * 0.09 + i * 0.06, dur: 0.18, vol: 0.09 }));
    },
    // down the slide: a slide whistle, wheee
    slide(dur = 1.1) {
      tone({ type: 'sine', f: 1500, to: 280, dur, vol: 0.12 });
      tone({ type: 'triangle', f: 750, to: 140, dur, vol: 0.04 });
      hiss({ filter: 'bandpass', f: 1800, to: 500, q: 1.5, dur, vol: 0.04 });
    },
    // landing at the bottom of a slide: a soft bump
    plop() {
      tone({ type: 'sine', f: 240, to: 120, dur: 0.16, vol: 0.18 });
      hiss({ filter: 'lowpass', f: 1200, to: 300, dur: 0.1, vol: 0.08 });
    },
    // too far: a boing off 100
    bounce() {
      tone({ type: 'sine', f: 300, to: 600, dur: 0.1, vol: 0.12 });
      tone({ type: 'sine', f: 600, to: 250, dur: 0.18, vol: 0.12, at: 0.1 });
    },
    // a pawn reaches 100: a sparkly chime
    top() {
      [784, 988, 1175, 1568].forEach((f, i) => tone({ type: 'triangle', f, at: i * 0.07, dur: 0.25, vol: 0.1 }));
      hiss({ filter: 'highpass', f: 6000, at: 0.2, dur: 0.4, vol: 0.05 });
    },
    // tap to hop, but not now
    nope() {
      tone({ f: 220, dur: 0.08, vol: 0.08 });
      tone({ f: 180, dur: 0.1, vol: 0.08, at: 0.09 });
    },
    // a CPU friend is thinking: a little hum
    think() { tone({ type: 'triangle', f: 196, to: 247, dur: 0.3, vol: 0.05 }); },
    // your brother's re-roll: a magic sparkle
    magic() {
      [1047, 1319, 1568, 2093].forEach((f, i) => tone({ type: 'sine', f, at: i * 0.05, dur: 0.2, vol: 0.07 }));
      hiss({ filter: 'highpass', f: 5000, dur: 0.35, vol: 0.05 });
    },
    // a nice tip: a little rising chime
    nice() { [784, 988, 1319].forEach((f, i) => tone({ type: 'triangle', f, at: i * 0.06, dur: 0.18, vol: 0.1 })); },
    // a kid wins
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'square', f, at: i * 0.11, dur: 0.16, vol: 0.05, lp: 3000 }));
      [523, 659, 784].forEach((f) => tone({ type: 'triangle', f: f * 2, at: 0.46, dur: 0.6, vol: 0.08 }));
      hiss({ filter: 'highpass', f: 6000, at: 0.46, dur: 0.5, vol: 0.06 });
      [784, 988, 1175, 1568].forEach((f, i) => tone({ type: 'triangle', f, at: 0.9 + i * 0.09, dur: 0.3, vol: 0.09 }));
    },
    // a CPU friend won: a soft wah-wah, never harsh
    lose() {
      [392, 370, 349, 311].forEach((f, i) => tone({ type: 'triangle', f, at: i * 0.22, dur: i === 3 ? 0.5 : 0.22, vol: 0.09 }));
    },
    // your brother pops in (and out)
    pop() {
      tone({ f: 300, to: 900, dur: 0.12, vol: 0.1 });
      hiss({ f: 2000, to: 6000, dur: 0.15, vol: 0.05 });
    },
    // the high five: a clap
    clap() {
      hiss({ filter: 'bandpass', f: 1500, q: 0.8, dur: 0.09, vol: 0.22 });
      hiss({ filter: 'highpass', f: 3000, dur: 0.05, vol: 0.1, at: 0.01 });
    },
  };

  SL.sfx = sfx;
})();
