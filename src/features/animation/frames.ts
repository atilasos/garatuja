export const speeds = [3, 6, 12] as const;

export function animationFps(value: number) {
  return speeds.reduce((nearest, speed) => Math.abs(speed - value) < Math.abs(nearest - value) ? speed : nearest, speeds[1]);
}

export function frameDuration(fps: number) {
  return 1000 / animationFps(fps);
}

export function gifDelay(frame: number, fps: number) {
  const centiseconds = frameDuration(fps) / 10;
  return 10 * (Math.round((frame + 1) * centiseconds) - Math.round(frame * centiseconds));
}

export function nextFrame(index: number, count: number, loop: boolean) {
  if (index + 1 < count) return index + 1;
  return loop && count > 0 ? 0 : undefined;
}
