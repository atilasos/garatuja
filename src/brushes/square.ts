import { pressureSize } from '../core/tooling/brush-stroke';
import type { BrushDef, PaintPointer, Point } from '../core/types';

function corners(p: PaintPointer, size: number): Point[] {
  const r = pressureSize(size, p.pressure) / 2;
  return [{ x: p.x - r, y: p.y - r }, { x: p.x - r, y: p.y + r },
    { x: p.x + r, y: p.y - r }, { x: p.x + r, y: p.y + r }];
}

function halfHull(points: readonly Point[]) {
  const hull: Point[] = [];
  for (const p of points) {
    while (hull.length >= 2) {
      const a = hull[hull.length - 2];
      const b = hull[hull.length - 1];
      if ((b.x - a.x) * (p.y - a.y) > (b.y - a.y) * (p.x - a.x)) break;
      hull.pop();
    }
    hull.push(p);
  }
  return hull.slice(0, -1);
}

export default {
  id: 'square', label: { pt: 'Quadrado', en: 'Square' }, order: 20, level: 1, spacing: .14,
  hint: { pt: 'Desenha um traço com pontas quadradas.', en: 'Draw a line with square ends.' },
  dab(ctx, d) {
    const size = pressureSize(d.size, d.pressure);
    ctx.fillStyle = d.color;
    ctx.fillRect(d.x - size / 2, d.y - size / 2, size, size);
  },
  segment(ctx, from, to, size, color) {
    // Sweeping a square along this segment fills the convex hull of its two ends.
    const points = [...corners(from, size), ...corners(to, size)].sort((a, b) => a.x - b.x || a.y - b.y);
    const outline = [...halfHull(points), ...halfHull(points.reverse())];
    ctx.fillStyle = color;
    ctx.beginPath();
    for (const point of outline) ctx.lineTo(point.x, point.y);
    ctx.closePath();
    ctx.fill();
  },
} satisfies BrushDef;
