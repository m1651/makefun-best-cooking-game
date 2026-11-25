// Lantern & Ladle: every sound is synthesized live with the Web Audio API —
// no audio files, no network. Short blips for actions, a sizzle for the wok,
// a little pentatonic pluck loop for the night-market mood.

const NOTE_FREQUENCIES = {
  c4: 261.63, d4: 293.66, e4: 329.63, g4: 392.0, a4: 440.0,
  c5: 523.25, e5: 659.25, g5: 783.99, a5: 880.0,
};

// A slow, cheerful loop of plucked notes, two bars long.
const MELODY = [
  ['e4', 0], ['g4', 0.5], ['a4', 1], ['g4', 1.5], ['e4', 2], ['d4', 2.5],
  ['c4', 3], ['e4', 3.5], ['g4', 4], ['a4', 4.5], ['g5', 5], ['e5', 5.5],
  ['a4', 6], ['g4', 6.5], ['e4', 7], ['d4', 7.5],
];
const BAR_SECONDS = 8;

export class KitchenAudio {
  constructor() {
    this.context = null;
    this.muted = false;
    this.musicOn = false;
    this.musicTimer = null;
    this.nextNoteTime = 0;
    this.noteIndex = 0;
  }

  /** Create the context on a user gesture; browsers forbid it before one. */
  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume();
      return;
    }
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return;
    this.context = new AudioContext();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.context) void this.context.resume();
  }

  /** A short sine blip that slides from `fromHz` to `toHz`. */
  blip(fromHz, toHz, seconds, volume, when = 0) {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime + when;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(fromHz, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, toHz), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.02);
  }

  /** A burst of filtered noise, for chopping and sizzling. */
  noise(seconds, volume, filterHz, when = 0) {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime + when;
    const length = Math.max(1, Math.floor(this.context.sampleRate * seconds));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterHz;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    source.connect(filter).connect(gain).connect(this.context.destination);
    source.start(start);
  }

  pickup() { this.blip(520, 720, 0.09, 0.12); }
  place() { this.blip(360, 260, 0.1, 0.12); }
  chop() { this.noise(0.12, 0.25, 1800); this.blip(180, 90, 0.08, 0.1); }
  chopDone() { this.blip(660, 880, 0.12, 0.12); }
  sizzle() { this.noise(0.5, 0.1, 5200); }
  cookDone() { this.blip(587, 880, 0.14, 0.12); this.blip(880, 1174, 0.14, 0.1, 0.12); }
  serve() {
    this.blip(523, 523, 0.1, 0.14);
    this.blip(659, 659, 0.1, 0.14, 0.1);
    this.blip(784, 784, 0.18, 0.16, 0.2);
  }
  wrong() { this.blip(220, 160, 0.22, 0.14); }
  expired() { this.blip(392, 196, 0.35, 0.12); }
  burnt() { this.noise(0.3, 0.2, 900); this.blip(160, 90, 0.3, 0.12); }
  gameOver() {
    this.blip(392, 392, 0.16, 0.14);
    this.blip(330, 330, 0.16, 0.14, 0.18);
    this.blip(262, 262, 0.3, 0.14, 0.36);
  }

  /** Start the plucked-note loop; it schedules each bar's notes ahead of time. */
  startMusic() {
    if (!this.context || this.musicOn) return;
    this.musicOn = true;
    this.barStart = this.context.currentTime + 0.1;
    this.barScheduled = false;
    const schedule = () => {
      if (!this.musicOn || !this.context) return;
      const now = this.context.currentTime;
      if (!this.barScheduled && this.barStart < now + 0.5) {
        for (const [note, offset] of MELODY) {
          this.pluck(NOTE_FREQUENCIES[note], this.barStart + offset);
        }
        this.barScheduled = true;
      }
      if (this.barScheduled && now >= this.barStart + BAR_SECONDS) {
        this.barStart += BAR_SECONDS;
        this.barScheduled = false;
      }
      this.musicTimer = window.setTimeout(schedule, 120);
    };
    schedule();
  }

  /** One plucked note at an absolute context time. */
  pluck(frequency, when) {
    if (!this.context || this.muted) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.07, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.9);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(when);
    oscillator.stop(when + 1);
  }

  stopMusic() {
    this.musicOn = false;
    if (this.musicTimer !== null) window.clearTimeout(this.musicTimer);
    this.musicTimer = null;
  }
}
