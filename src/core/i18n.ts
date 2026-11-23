import type { L10n } from './types';

export type Locale = keyof L10n;
let locale: Locale = 'pt';

export function setLocale(value: Locale) {
  locale = value;
  document.documentElement.lang = value === 'pt' ? 'pt-PT' : 'en';
}

export function getLocale(): Locale {
  return locale;
}

export function t(text: L10n): string {
  return text[locale] || text.en;
}

/* ------------------------------------------------------------------ */
/* Reading aloud                                                       */
/* ------------------------------------------------------------------ */

type VoiceLike = Pick<SpeechSynthesisVoice, 'lang' | 'localService'>;

/**
 * Pick a voice for the locale. Only on-device voices are used, because remote
 * voices send the text to a server (principle 8). Portuguese prefers pt-PT,
 * falls back to pt-BR and then to any other Portuguese voice.
 */
export function chooseVoice<V extends VoiceLike>(voices: readonly V[], wanted: Locale): V | undefined {
  const local = voices.filter(voice => voice.localService);
  const tag = (voice: VoiceLike) => voice.lang.replace('_', '-').toLowerCase();
  const order = wanted === 'pt' ? ['pt-pt', 'pt-br', 'pt'] : ['en-gb', 'en-us', 'en'];
  for (const prefix of order) {
    const match = local.find(voice => tag(voice) === prefix || tag(voice).startsWith(prefix + '-'));
    if (match) return match;
  }
  return undefined;
}

let missingVoice: (() => void) | undefined;
let pending: L10n | undefined;
let listening = false;

/** Called (at most once per change of locale) when no suitable voice exists. */
export function onMissingVoice(handler: () => void) {
  missingVoice = handler;
}

function voices() {
  return window.speechSynthesis.getVoices();
}

export function speak(text: L10n) {
  if (!('speechSynthesis' in window)) {
    missingVoice?.();
    return false;
  }
  const available = voices();
  if (!available.length) {
    // Chrome loads voices asynchronously: say it once they arrive.
    pending = text;
    if (!listening) {
      listening = true;
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        const next = pending;
        pending = undefined;
        if (next && !say(next)) missingVoice?.();
      });
    }
    return true;
  }
  const spoken = say(text);
  if (!spoken) missingVoice?.();
  return spoken;
}

function say(text: L10n) {
  const voice = chooseVoice(voices(), locale);
  if (!voice) return false;
  const utterance = new SpeechSynthesisUtterance(t(text));
  utterance.lang = voice.lang;
  utterance.voice = voice;
  utterance.rate = 0.92;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  pending = undefined;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
