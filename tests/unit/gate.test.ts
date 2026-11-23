import { describe, expect, it } from 'vitest';
import { checkAnswer, makeChallenge, numberWord } from '../../src/features/teacher/gate';

describe('adult gate', () => {
  it('writes numbers in European Portuguese and English', () => {
    expect(numberWord(7)).toEqual({ pt: 'sete', en: 'seven' });
    expect(numberWord(16)).toEqual({ pt: 'dezasseis', en: 'sixteen' });
    expect(numberWord(14).pt).toBe('catorze');
    expect(numberWord(81)).toEqual({ pt: 'oitenta e um', en: 'eighty-one' });
    expect(() => numberWord(100)).toThrow(RangeError);
  });

  it('asks a sum written in words with addends from 23 to 47', () => {
    const values = [0, 0.999, 0.5];
    let i = 0;
    const challenge = makeChallenge(() => values[i++ % values.length]);
    expect(challenge).toMatchObject({ a: 23, b: 47, answer: 70 });
    expect(challenge.question).toEqual({ pt: 'vinte e três mais quarenta e sete', en: 'twenty-three plus forty-seven' });
    expect(challenge.question.pt).not.toMatch(/\d/);
    for (let n = 0; n < 200; n++) {
      const random = makeChallenge();
      expect(random.a).toBeGreaterThanOrEqual(23);
      expect(random.b).toBeLessThanOrEqual(47);
      expect(random.answer).toBe(random.a + random.b);
    }
  });

  it('accepts only the right answer, written in words', () => {
    expect(checkAnswer('72', 72)).toBe(false);
    expect(checkAnswer(' 72 ', 72)).toBe(false);
    expect(checkAnswer('doze', 12)).toBe(true);
    expect(checkAnswer('Twelve', 12)).toBe(true);
    expect(checkAnswer('seventy two', 72)).toBe(true)
    expect(checkAnswer(' Setenta  e dois ', 72)).toBe(true);
    expect(checkAnswer('13', 12)).toBe(false);
    expect(checkAnswer('', 12)).toBe(false);
    expect(checkAnswer('12a', 12)).toBe(false);
  });
});
