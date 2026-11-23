import type { Point, Rect } from '../types';

/**
 * Pure geometry for the Shapes tool. Every outline is built around the origin and fills
 * the box (±w/2, ±h/2) exactly, so the shape a child drags out is the shape they get.
 */

export type ShapeId = 'square' | 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'diamond' | 'pentagon'
  | 'hexagon' | 'octagon' | 'star5' | 'star6' | 'heart' | 'arrow';

export const shapeIds: ShapeId[] = ['square', 'rectangle', 'circle', 'ellipse', 'triangle', 'star5', 'heart',
  'diamond', 'pentagon', 'hexagon', 'octagon', 'star6', 'arrow'];

/** Shapes that always have equal width and height. */
export const regularShapes: ReadonlySet<ShapeId> = new Set(['square', 'circle']);

/** 0 = points right, 1 = down, 2 = left, 3 = up. */
export type Heading = 0 | 1 | 2 | 3;

export interface Box {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export interface DragOptions {
  fromCenter: boolean;
  /** Keep width equal to height (square, circle, or Shift held). */
  square: boolean;
}

/** Turn a drag from `start` to `end` into the shape's box. */
export function resolveBox(start: Point, end: Point, { fromCenter, square }: DragOptions): Box {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const reach = square ? Math.max(Math.abs(dx), Math.abs(dy)) : 0;
  const halfW = square ? reach : Math.abs(dx);
  const halfH = square ? reach : Math.abs(dy);
  if (fromCenter) return { cx: start.x, cy: start.y, w: halfW * 2, h: halfH * 2 };
  return { cx: start.x + Math.sign(dx || 1) * halfW / 2, cy: start.y + Math.sign(dy || 1) * halfH / 2, w: halfW, h: halfH };
}

/** The direction an arrow points when its box is dragged: along the longer side, towards the pointer. */
export function arrowHeading(start: Point, end: Point): Heading {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 2 : 0;
  return dy < 0 ? 3 : 1;
}

/** Fit points exactly into the box (±w/2, ±h/2). */
function fit(points: Point[], w: number, h: number): Point[] {
  const bounds = pointBounds(points);
  const sx = bounds.w > 0 ? w / bounds.w : 1;
  const sy = bounds.h > 0 ? h / bounds.h : 1;
  const mx = bounds.x + bounds.w / 2;
  const my = bounds.y + bounds.h / 2;
  return points.map(p => ({ x: (p.x - mx) * sx, y: (p.y - my) * sy }));
}

function polygon(count: number, w: number, h: number, offset = 0): Point[] {
  return fit(Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + offset + i * 2 * Math.PI / count;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  }), w, h);
}

function star(points: number, inner: number, w: number, h: number): Point[] {
  return fit(Array.from({ length: points * 2 }, (_, i) => {
    const angle = -Math.PI / 2 + i * Math.PI / points;
    const radius = i % 2 ? inner : 1;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  }), w, h);
}

function curve(count: number, w: number, h: number, at: (t: number) => Point): Point[] {
  return fit(Array.from({ length: count }, (_, i) => at(i / count)), w, h);
}

/** Number of segments for a curved outline of the given size: smooth at any zoom. */
export function curveSegments(w: number, h: number) {
  return Math.min(180, Math.max(32, Math.ceil(Math.max(w, h) / 6)));
}

/**
 * Outline of a shape centred on the origin. Arrows are drawn pointing right and rotated
 * by `heading`; for a vertical arrow `w` and `h` still describe the box on the page.
 */
export function shapeOutline(shape: ShapeId, w: number, h: number, heading: Heading = 0): Point[] {
  switch (shape) {
    case 'square':
    case 'rectangle':
      return [{ x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 }, { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }];
    case 'circle':
    case 'ellipse':
      return curve(curveSegments(w, h), w, h, t => ({ x: Math.cos(t * 2 * Math.PI - Math.PI / 2), y: Math.sin(t * 2 * Math.PI - Math.PI / 2) }));
    case 'triangle': return polygon(3, w, h);
    case 'diamond': return polygon(4, w, h);
    case 'pentagon': return polygon(5, w, h);
    case 'hexagon': return polygon(6, w, h);
    case 'octagon': return polygon(8, w, h, Math.PI / 8);
    case 'star5': return star(5, .382, w, h);
    case 'star6': return star(6, .577, w, h);
    case 'heart':
      return curve(Math.max(64, curveSegments(w, h)), w, h, t => {
        const a = t * 2 * Math.PI;
        return { x: 16 * Math.sin(a) ** 3, y: -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) };
      });
    case 'arrow': {
      const vertical = heading === 1 || heading === 3;
      const length = vertical ? h : w;
      const thick = vertical ? w : h;
      const l = length / 2;
      const t = thick / 2;
      const head = Math.min(length * .45, thick * .9);
      const shaft = t * .42;
      const flat = [{ x: -l, y: -shaft }, { x: l - head, y: -shaft }, { x: l - head, y: -t }, { x: l, y: 0 },
        { x: l - head, y: t }, { x: l - head, y: shaft }, { x: -l, y: shaft }];
      return rotate(flat, heading * Math.PI / 2);
    }
  }
}

export function rotate(points: Point[], angle: number): Point[] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return points.map(p => ({ x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos }));
}

/** Rotate around the origin, then move to (cx, cy). */
export function placeShape(points: Point[], cx: number, cy: number, angle: number): Point[] {
  return rotate(points, angle).map(p => ({ x: p.x + cx, y: p.y + cy }));
}

export function pointBounds(points: Point[]): Rect {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const p of points) {
    left = Math.min(left, p.x);
    top = Math.min(top, p.y);
    right = Math.max(right, p.x);
    bottom = Math.max(bottom, p.y);
  }
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/** The direction from the shape's centre to the pointer, as the angle the shape should turn by (0 = upright). */
export function turnTowards(center: Point, pointer: Point, snap: boolean, minimum = 10): number | undefined {
  const dx = pointer.x - center.x;
  const dy = pointer.y - center.y;
  if (Math.hypot(dx, dy) < minimum) return undefined;
  const angle = Math.atan2(dy, dx) + Math.PI / 2;
  return snap ? Math.round(angle / (Math.PI / 12)) * Math.PI / 12 : angle;
}

/** A tap without a drag still draws a friendly shape. */
export function defaultSize(shape: ShapeId): { w: number; h: number } {
  if (regularShapes.has(shape) || shape === 'star5' || shape === 'star6' || shape === 'heart') return { w: 170, h: 170 };
  if (shape === 'arrow') return { w: 220, h: 130 };
  return { w: 220, h: 150 };
}
