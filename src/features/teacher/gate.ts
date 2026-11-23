/**
 * Adult gate: press and hold for 3 s, then answer a sum written in words
 * ("sete mais cinco"). Young children cannot read the words or do the sum;
 * adults pass in a few seconds. Pure logic, unit-tested.
 */
import type { L10n } from '../../core/types';

export const HOLD_MS = 3000;

const ptWords = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
  'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezasseis', 'dezassete', 'dezoito', 'dezanove', 'vinte'];
const enWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

export function numberWord(n: number): L10n {
  if (!Number.isInteger(n) || n < 0 || n > 20) throw new RangeError('Only 0–20 are written in words');
  return { pt: ptWords[n], en: enWords[n] };
}

export interface Challenge {
  a: number;
  b: number;
  question: L10n;
  answer: number;
}

/** Two addends from 3 to 9, so the sum always needs some thought (6–18). */
export function makeChallenge(random: () => number = Math.random): Challenge {
  const pick = () => 3 + Math.floor(random() * 7);
  const a = pick();
  const b = pick();
  const wa = numberWord(a);
  const wb = numberWord(b);
  return { a, b, answer: a + b, question: { pt: `${wa.pt} mais ${wb.pt}`, en: `${wa.en} plus ${wb.en}` } };
}

/** Accept digits ("12") or the number written in words, in either language. */
export function checkAnswer(input: string, answer: number) {
  const value = input.trim().toLowerCase().normalize('NFC');
  if (!value) return false;
  if (/^\d+$/.test(value)) return Number(value) === answer;
  if (answer > 20) return false;
  const word = numberWord(answer);
  return value === word.pt || value === word.en || (answer === 14 && value === 'quatorze');
}
