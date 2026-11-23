import type { SoundId } from './types';

/**
 * A small palette of soft, synthesised sounds (no audio files). Each sound is
 * a short recipe of tones and filtered noise, kept quiet and below ~1.2 kHz
 * where possible so nothing is shrill. Errors are silent unless enabled.
 */
type Voice =
  | { kind: 'tone'; wave: OscillatorType; from: number; to: number; at: number; length: number; level: number }
  | { kind: 'noise'; filter: BiquadFilterType; from: number; to: number; at: number; length: number; level: number };

const tone = (from: number, to: number, at: number, length: number, level = 1, wave: OscillatorType = 'sine'): Voice =>
  ({ kind: 'tone', wave, from, to, at, length, level });
const noise = (filter: BiquadFilterType, from: number, to: number, at: number, length: number, level = 1): Voice =>
  ({ kind: 'noise', filter, from, to, at, length, level });

export const recipes: Record<SoundId, Voice[]> = {
  tap: [tone(620, 560, 0, 0.06, 0.7)],
  brush: [noise('bandpass', 900, 1300, 0, 0.16, 0.9)],
  erase: [noise('lowpass', 1100, 500, 0, 0.18, 1)],
  fill: [tone(280, 560, 0, 0.2, 0.9), tone(420, 840, 0.03, 0.18, 0.3, 'triangle')],
  stamp: [tone(190, 90, 0, 0.14, 1), noise('lowpass', 500, 300, 0, 0.06, 0.6)],
  shape: [tone(523, 523, 0, 0.1, 0.7, 'triangle'), tone(659, 659, 0.08, 0.14, 0.7, 'triangle')],
  line: [tone(392, 660, 0, 0.12, 0.7)],
  magic: [tone(784, 784, 0, 0.16, 0.45), tone(988, 988, 0.06, 0.16, 0.4), tone(1175, 1175, 0.12, 0.22, 0.35)],
  undo: [tone(494, 392, 0, 0.14, 0.7, 'triangle')],
  redo: [tone(392, 494, 0, 0.14, 0.7, 'triangle')],
  page: [noise('highpass', 1500, 2500, 0, 0.12, 0.5)],
  save: [tone(659, 659, 0, 0.16, 0.6), tone(880, 880, 0.11, 0.26, 0.55)],
  oops: [tone(330, 294, 0, 0.18, 0.5, 'triangle')],
};

/** Peak gain of every sound: deliberately low. */
const volume = 0.06;
/** Minimum gap between two plays of the same sound, so dragging never buzzes. */
const spacing = 0.09;

export class Sounds {
  enabled = false;
  /** Error sounds stay off unless explicitly turned on (principle 5). */
  errors = false;
  private audio?: AudioContext;
  private noiseBuffer?: AudioBuffer;
  private last = new Map<SoundId, number>();

  play(id: SoundId) {
    if (!this.enabled || (id === 'oops' && !this.errors) || !('AudioContext' in window)) return;
    const audio = this.audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume().catch(() => {});
    const now = audio.currentTime;
    if (now - (this.last.get(id) ?? -1) < spacing) return;
    this.last.set(id, now);
    for (const voice of recipes[id]) this.voice(audio, voice, now + voice.at);
  }

  private envelope(audio: AudioContext, start: number, length: number, level: number) {
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume * level, start + Math.min(0.02, length / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    gain.connect(audio.destination);
    return gain;
  }

  private voice(audio: AudioContext, voice: Voice, start: number) {
    const gain = this.envelope(audio, start, voice.length, voice.level);
    if (voice.kind === 'tone') {
      const oscillator = audio.createOscillator();
      oscillator.type = voice.wave;
      oscillator.frequency.setValueAtTime(voice.from, start);
      oscillator.frequency.exponentialRampToValueAtTime(voice.to, start + voice.length);
      oscillator.connect(gain);
      oscillator.start(start);
      oscillator.stop(start + voice.length + 0.02);
      return;
    }
    const source = audio.createBufferSource();
    source.buffer = this.noiseBuffer ??= this.makeNoise(audio);
    const filter = audio.createBiquadFilter();
    filter.type = voice.filter;
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(voice.from, start);
    filter.frequency.exponentialRampToValueAtTime(voice.to, start + voice.length);
    source.connect(filter).connect(gain);
    source.start(start);
    source.stop(start + voice.length + 0.02);
  }

  private makeNoise(audio: AudioContext) {
    const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.4), audio.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 1;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 16807) % 2147483647;
      data[i] = (seed / 2147483647) * 2 - 1;
    }
    return buffer;
  }
}
