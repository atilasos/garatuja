import type { L10n } from '../../core/types';

export const HOLD_MS = 3000;

const ptWords = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
  'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezasseis', 'dezassete', 'dezoito', 'dezanove', 'vinte'];
const enWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

const ptTens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const enTens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

export function numberWord(n: number): L10n {
  if (!Number.isInteger(n) || n < 0 || n > 99) throw new RangeError('Only 0–99 are written in words');
  if (n <= 20) return { pt: ptWords[n], en: enWords[n] };
  const tens = Math.floor(n / 10);
  const units = n % 10;
  return {
    pt: ptTens[tens] + (units ? ' e ' + ptWords[units] : ''),
    en: enTens[tens] + (units ? '-' + enWords[units] : ''),
  };
}

export interface Challenge {
  a: number;
  b: number;
  question: L10n;
  answer: number;
}

/** Two addends from 23 to 47, keeping the answer below 100. */
export function makeChallenge(random: () => number = Math.random): Challenge {
  const pick = () => 23 + Math.floor(random() * 25);
  const a = pick();
  const b = pick();
  const wa = numberWord(a);
  const wb = numberWord(b);
  return { a, b, answer: a + b, question: { pt: `${wa.pt} mais ${wb.pt}`, en: `${wa.en} plus ${wb.en}` } };
}

export function checkAnswer(input: string, answer: number) {
  const value = input.trim().toLowerCase().normalize('NFC').replace(/[-\s]+/g, ' ');
  const word = numberWord(answer);
  return value === word.pt || value === word.en.replace('-', ' ');
}

const pinKey = 'garatuja.adultPin';
export const validPin = (pin: string) => /^[0-9]{4}$/.test(pin);

export function removePin() { localStorage.removeItem(pinKey); }

export function readPin() {
  return localStorage.getItem(pinKey);
}

async function hashPin(pin: string, salt: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', iterations: 150_000,
    salt: encoder.encode(salt) }, key, 256);
  return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function setPin(pin: string) {
  if (!validPin(pin)) throw new Error('Invalid PIN');
  const salt = crypto.randomUUID();
  localStorage.setItem(pinKey, salt + ':' + await hashPin(pin, salt));
}

export async function checkPin(pin: string, saved: string) {
  if (!validPin(pin)) return false;
  const [salt, hash] = saved.split(':');
  return Boolean(salt && hash && await hashPin(pin, salt) === hash);
}
