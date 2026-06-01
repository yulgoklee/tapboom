/**
 * Sound — WebAudio synthesized SFX. No audio files, zero bytes.
 * Silent by default (browser autoplay policy + muted viewers).
 * Usage: Sound.play('break'), Sound.play('combo', level), Sound.toggle()
 */
const Sound = (() => {
  let ctx = null;
  let enabled = false;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function tone(freq, type, duration, gain = 0.3, delay = 0) {
    if (!enabled) return;
    try {
      const ac = getCtx();
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.connect(g);
      g.connect(ac.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
      g.gain.setValueAtTime(gain, ac.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
      osc.start(ac.currentTime + delay);
      osc.stop(ac.currentTime + delay + duration + 0.01);
    } catch (e) { /* ignore */ }
  }

  const sounds = {
    break: () => tone(400 + Math.random() * 200, 'square', 0.05, 0.15),
    breakMany: () => {
      tone(600, 'square', 0.08, 0.2);
      tone(800, 'sawtooth', 0.06, 0.15, 0.02);
    },
    item: () => {
      tone(880, 'sine', 0.1, 0.25);
      tone(1320, 'sine', 0.08, 0.2, 0.05);
    },
    itemBad: () => tone(200, 'sawtooth', 0.15, 0.2),
    combo: (level = 1) => {
      const base = 440 * Math.pow(1.2, Math.min(level, 12));
      tone(base, 'sine', 0.12, 0.3);
    },
    gameover: () => {
      tone(300, 'sawtooth', 0.3, 0.3);
      tone(200, 'sawtooth', 0.4, 0.25, 0.15);
      tone(150, 'sawtooth', 0.5, 0.2, 0.35);
    },
    clear: () => {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 'sine', 0.2, 0.3, i * 0.08));
    },
    paddle: () => tone(220, 'sine', 0.04, 0.1),
    wall: () => tone(180, 'sine', 0.04, 0.08),
  };

  function play(name, ...args) {
    if (!enabled) return;
    if (sounds[name]) sounds[name](...args);
  }

  function toggle() {
    enabled = !enabled;
    if (enabled) {
      // Unlock AudioContext on first user gesture
      try { getCtx().resume(); } catch (e) { /* ignore */ }
    }
    return enabled;
  }

  function setEnabled(val) { enabled = val; }
  function isEnabled() { return enabled; }

  return { play, toggle, setEnabled, isEnabled };
})();

export default Sound;
