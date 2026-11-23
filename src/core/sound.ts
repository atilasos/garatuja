import type { SoundId } from './types';

const pitches: Record<SoundId, number> = {
  tap: 490, brush: 340, erase: 280, fill: 520, stamp: 380, shape: 440, line: 400,
  magic: 680, undo: 300, redo: 540, page: 460, save: 590, oops: 220,
};

export class Sounds {
  enabled = false;
  private audio?: AudioContext;

  play(id: SoundId) {
    if (!this.enabled || !('AudioContext' in window)) return;
    const audio = this.audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume().catch(() => {});
    const start = audio.currentTime;
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(pitches[id], start);
    tone.frequency.exponentialRampToValueAtTime(pitches[id] * 1.12, start + 0.09);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.075, start + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
    tone.connect(gain).connect(audio.destination);
    tone.start(start);
    tone.stop(start + 0.13);
  }
}
