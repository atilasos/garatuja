import { expect, test } from 'vitest';
import { animationFps, frameDuration, gifDelay, nextFrame, speeds } from '../../src/features/animation/frames';

test('selects the nearest playback speed and times GIF frames without accumulating rounding drift', () => {
  expect(animationFps(7)).toBe(6);
  expect(animationFps(1)).toBe(3);
  expect(animationFps(20)).toBe(12);
  for (const speed of speeds) {
    expect(frameDuration(speed) * speed).toBeCloseTo(1000);
    const delays = Array.from({ length: speed * 5 }, (_, index) => gifDelay(index, speed));
    expect(delays.every(delay => delay % 10 === 0)).toBe(true);
    expect(delays.reduce((sum, delay) => sum + delay, 0)).toBe(5000);
  }
});

test('advances, stops on the last frame or loops back to the first', () => {
  expect(nextFrame(0, 3, false)).toBe(1);
  expect(nextFrame(2, 3, false)).toBeUndefined();
  expect(nextFrame(2, 3, true)).toBe(0);
  expect(nextFrame(0, 0, true)).toBeUndefined();
});
