import { describe, expect, it } from 'vitest';
import { checkAnswer, makeChallenge, numberWord } from '../../src/features/teacher/gate';

describe('adult gate', () => {
  it('writes numbers in European Portuguese and English', () => {
    expect(numberWord(7)).toEqual({ pt: 'sete', en: 'seven' });
    expect(numberWord(16)).toEqual({ pt: 'dezasseis', en: 'sixteen' });
    expect(numberWord(14).pt).toBe('catorze');
    expect(() => numberWord(21)).toThrow(RangeError);
  });

  it('asks a sum written in words with addends from 3 to 9', () => {
    const values = [0, 0.999, 0.5];
    let i = 0;
    const challenge = makeChallenge(() => values[i++ % values.length]);
    expect(challenge).toMatchObject({ a: 3, b: 9, answer: 12 });
    expect(challenge.question).toEqual({ pt: 'três mais nove', en: 'three plus nine' });
    expect(challenge.question.pt).not.toMatch(/\d/);
    for (let n = 0; n < 200; n++) {
      const random = makeChallenge();
      expect(random.a).toBeGreaterThanOrEqual(3);
      expect(random.b).toBeLessThanOrEqual(9);
      expect(random.answer).toBe(random.a + random.b);
    }
  });

  it('accepts only the right answer, in digits or words', () => {
    expect(checkAnswer('12', 12)).toBe(true);
    expect(checkAnswer(' 12 ', 12)).toBe(true);
    expect(checkAnswer('doze', 12)).toBe(true);
    expect(checkAnswer('Twelve', 12)).toBe(true);
    expect(checkAnswer('quatorze', 14)).toBe(true);
    expect(checkAnswer('13', 12)).toBe(false);
    expect(checkAnswer('', 12)).toBe(false);
    expect(checkAnswer('12a', 12)).toBe(false);
  });
});
