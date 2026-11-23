import { describe, expect, it } from 'vitest';
import { clampRect, hexToRgb, hslToRgb, interpolateDabs, pagePoint, rgbToHex, rgbToHsl, seededRandom, strokeBounds, unionRect } from '../../src/core/draw';

describe('drawing coordinates and utilities', () => {
  it('maps client coordinates using the visible CSS dimensions', () => {
    expect(pagePoint({ x: 300, y: 180 }, { x: 100, y: 30, w: 400, h: 300 })).toEqual({ x: 800, y: 600 });
    expect(pagePoint({ x: 104, y: 67 }, { x: 24, y: 7, w: 160, h: 120 })).toEqual({ x: 800, y: 600 });
    expect(pagePoint({ x: 10, y: 0 }, { x: 24, y: 7, w: 160, h: 120 }).x).toBe(-140);
  });

  it('combines and clips non-integer dirty bounds', () => {
    const first = strokeBounds({ x: 2, y: 5 }, { x: 40.5, y: 12 }, 6);
    const second = { x: 39, y: 11, w: 25, h: 28 };
    expect(clampRect(unionRect(first, second), 60, 50)).toEqual({ x: 0, y: 0, w: 60, h: 39 });
    expect(clampRect({ x: 100, y: 10, w: 20, h: 20 }, 60, 50).w).toBe(0);
  });

  it('preserves even dab spacing across input segments', () => {
    const marks: number[] = [];
    const first = interpolateDabs({ x: 0, y: 0 }, { x: 7, y: 0 }, 5, 5, p => marks.push(p.x));
    const remaining = interpolateDabs({ x: 7, y: 0 }, { x: 16, y: 0 }, 5, first, p => marks.push(p.x));
    expect(marks).toEqual([5, 10, 15]);
    expect(remaining).toBe(4);
  });

  it('round-trips colors and wraps hue', () => {
    for (const hex of ['#000000', '#ffffff', '#ff0000', '#e05748', '#7f81aa', '#459267']) {
      expect(rgbToHex(hslToRgb(rgbToHsl(hexToRgb(hex))))).toEqual(hex);
    }
    expect(rgbToHex(hslToRgb({ h: -120, s: 1, l: .5 }))).toBe('#0000ff');
  });

  it('replays a seeded random sequence', () => {
    const sequence = (seed: number) => {
      const next = seededRandom(seed);
      return Array.from({ length: 8 }, next);
    };
    expect(sequence(5)).toEqual(sequence(5));
    expect(sequence(5)).not.toEqual(sequence(6));
    expect(sequence(5).every(value => value >= 0 && value < 1)).toBe(true);
  });
});
