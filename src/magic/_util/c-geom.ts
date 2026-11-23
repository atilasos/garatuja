import { strokeBounds, unionRect } from '../../core/draw';
import type { Point, Rect, ToolContext } from '../../core/types';

/** Deterministic hash in [0, 1) for integer grid coordinates. */
export function cellHash(col: number, row: number, salt = 0): number {
  let n = Math.imul(col | 0, 374761393) ^ Math.imul(row | 0, 668265263) ^ Math.imul(salt | 0, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Accumulates dirty rectangles and reports their union once to the engine. */
export class DirtyTracker {
  private rect?: Rect;

  add(rect: Rect): void {
    this.rect = this.rect ? unionRect(this.rect, rect) : rect;
  }

  addPoint(x: number, y: number, pad: number): void {
    this.add({ x: x - pad, y: y - pad, w: pad * 2, h: pad * 2 });
  }

  addSegment(a: Point, b: Point, pad: number): void {
    this.add(strokeBounds(a, b, pad));
  }

  flush(c: ToolContext): void {
    if (this.rect) c.markDirty(this.rect);
  }
}

/** Clip the canvas to a smooth capsule covering the stroke segment [from, to]. */
export function clipCapsule(ctx: CanvasRenderingContext2D, from: Point, to: Point, radius: number): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  ctx.beginPath();
  if (len < 0.01) {
    ctx.arc(from.x, from.y, radius, 0, Math.PI * 2);
  } else {
    const angle = Math.atan2(dy, dx);
    ctx.arc(from.x, from.y, radius, angle + Math.PI / 2, angle + Math.PI * 1.5);
    ctx.arc(to.x, to.y, radius, angle - Math.PI / 2, angle + Math.PI / 2);
    ctx.closePath();
  }
  ctx.clip();
}

/** Shortest distance from point (px, py) to line segment [a, b]. */
export function distanceToSegment(px: number, py: number, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return Math.hypot(px - a.x, py - a.y);
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lenSq));
  return Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t));
}

/** Paint a grid-locked pattern clipped to the brush capsule and mark its dirty bounds. */
export function paintClippedPattern(
  from: Point,
  to: Point,
  c: ToolContext,
  radius: number,
  draw: (ctx: CanvasRenderingContext2D, area: Rect) => void,
): void {
  const area = strokeBounds(from, to, radius + 2);
  const ctx = c.ctx;
  ctx.save();
  clipCapsule(ctx, from, to, radius);
  draw(ctx, area);
  ctx.restore();
  c.markDirty(strokeBounds(from, to, radius + 3));
}
