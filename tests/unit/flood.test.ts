import { expect, it } from 'vitest';
import { floodFill } from '../../src/core/flood';
import { timeBudget } from './time-budget';

const red = { r: 200, g: 24, b: 28 };
const pixels = (width: number, height: number) => ({ width, height, data: new Uint8ClampedArray(width * height * 4).fill(255) });

it('follows a connected tolerant region without mutating the input', () => {
  const source = pixels(4, 3);
  for (const index of [1, 5, 9]) source.data.set([15, 15, 15, 255], index * 4);
  source.data.set([238, 232, 239, 255], 4 * 4);
  const result = floodFill(source, { x: 0, y: 0 }, red);
  expect(result?.dirty).toEqual({ x: 0, y: 0, w: 1, h: 3 });
  expect([...result!.data.slice(16, 20)]).toEqual([200, 24, 28, 255]);
  expect([...result!.data.slice(8, 12)]).toEqual([255, 255, 255, 255]);
  expect([...source.data.slice(0, 4)]).toEqual([255, 255, 255, 255]);
});

it('treats a guide as a barrier, including the starting pixel', () => {
  const source = pixels(5, 3);
  const guide = new Uint8ClampedArray(source.data.length);
  for (const index of [2, 7, 12]) guide[index * 4 + 3] = 140;
  const result = floodFill(source, { x: 4, y: 0 }, red, 12, guide);
  expect(result?.dirty).toEqual({ x: 3, y: 0, w: 2, h: 3 });
  expect(floodFill(source, { x: 2, y: 0 }, red, 12, guide)).toBeNull();
  expect(floodFill(source, { x: -1, y: 0 }, red)).toBeNull();
  expect(floodFill(source, { x: 0, y: 0 }, { r: 255, g: 255, b: 255 })).toBeNull();
});

it('fills the entire logical page within 150 ms', () => {
  const source = pixels(1600, 1200);
  const start = performance.now();
  const result = floodFill(source, { x: 500, y: 500 }, red);
  const elapsed = performance.now() - start;
  expect(result?.dirty).toEqual({ x: 0, y: 0, w: 1600, h: 1200 });
  expect(result?.data.at(-4)).toBe(200);
  expect(elapsed).toBeLessThan(timeBudget(150));
});
