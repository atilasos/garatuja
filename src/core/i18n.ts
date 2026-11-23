import type { L10n } from './types';

export type Locale = keyof L10n;
let locale: Locale = 'pt';

export function setLocale(value: Locale) {
  locale = value;
  document.documentElement.lang = value === 'pt' ? 'pt-PT' : 'en';
}

export function t(text: L10n): string {
  return text[locale] || text.en;
}

export function speak(text: L10n) {
  if (!('speechSynthesis' in window)) return false;
  const lang = locale === 'pt' ? 'pt-PT' : 'en';
  const voice = window.speechSynthesis.getVoices().find(candidate => candidate.localService && candidate.lang.replace('_', '-').toLowerCase() === lang.toLowerCase())
    ?? window.speechSynthesis.getVoices().find(candidate => candidate.localService && candidate.lang.startsWith(lang + '-'));
  if (!voice) return false;
  const utterance = new SpeechSynthesisUtterance(t(text));
  utterance.lang = lang;
  utterance.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}
