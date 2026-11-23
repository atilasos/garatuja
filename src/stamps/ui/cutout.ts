import { viewport } from '../../core/canvas';
import { clampRect } from '../../core/draw';
import type { Point, Rect } from '../../core/types';

export type SelectionShape = 'rectangle' | 'lasso';

export function outline(shape: SelectionShape, trace: readonly Point[]): readonly Point[] {
  if (shape === 'lasso') return trace;
  const first = trace[0];
  const last = trace[trace.length - 1];
  return [first, { x: last.x, y: first.y }, last, { x: first.x, y: last.y }];
}

export function outlineBounds(points: readonly Point[], width: number, height: number): Rect {
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (const { x, y } of points) {
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  return points.length
    ? clampRect({ x: left, y: top, w: right - left, h: bottom - top }, width, height)
    : { x: 0, y: 0, w: 0, h: 0 };
}

export function tracePath(ctx: Pick<CanvasRenderingContext2D, 'beginPath' | 'moveTo' | 'lineTo' | 'closePath'>, points: readonly Point[]) {
  ctx.beginPath();
  for (const [index, p] of points.entries()) {
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
}

export function lift(ctx: CanvasRenderingContext2D, paper: HTMLCanvasElement, bounds: Rect, points: readonly Point[]) {
  const { x, y, w, h } = bounds;
  const cutout = viewport(w, h, false, true);
  cutout.save();
  cutout.translate(-x, -y);
  tracePath(cutout, points);
  cutout.clip('evenodd');
  cutout.drawImage(ctx.canvas, 0, 0);
  cutout.restore();

  // An open trace or a line dragged back onto itself may enclose no pixels.
  if (!cutout.getImageData(0, 0, w, h).data.some((value, index) => index % 4 === 3 && value > 0)) return;
  ctx.save();
  tracePath(ctx, points);
  ctx.clip('evenodd');
  ctx.drawImage(paper, x, y, w, h, x, y, w, h);
  ctx.restore();
  return cutout;
}

/** Mutate RGBA cutout data, comparing each pixel to the original paper underneath it. */
export function removePaper(picture: Uint8ClampedArray, paper: Uint8ClampedArray, tolerance = 12) {
  let visible = false;
  for (let i = 0; i < picture.length; i += 4) {
    if (!picture[i + 3]) continue;
    const difference = Math.max(
      Math.abs(picture[i] - paper[i]),
      Math.abs(picture[i + 1] - paper[i + 1]),
      Math.abs(picture[i + 2] - paper[i + 2]),
    );
    if (difference <= tolerance) picture[i + 3] = 0;
    else visible = true;
  }
  return visible;
}
