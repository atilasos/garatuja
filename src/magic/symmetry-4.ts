import type { MagicEffect, Point } from '../core/types';
import { edgeShade, highlightTint, rgba } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';

function paintSegment(ctx: CanvasRenderingContext2D, a: Point, b: Point, width: number, color: string, dirty: DirtyTracker) {
  ctx.strokeStyle = edgeShade(color);
  ctx.lineWidth = width + 1.8;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x + 0.05, b.y);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x + 0.05, b.y);
  ctx.stroke();

  ctx.strokeStyle = rgba(highlightTint(color), 0.34);
  ctx.lineWidth = Math.max(1, width * 0.28);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x + 0.05, b.y);
  ctx.stroke();

  dirty.addSegment(a, b, width * 0.5 + 3);
}

export default {
  id: 'symmetry-4',
  label: { pt: 'Simetria em 4', en: '4-way symmetry' },
  hint: { pt: 'Arrasta para pintar espelhado nos quatro cantos.', en: 'Drag to paint mirrored in all four quarters.' },
  category: 'padroes',
  level: 2,
  order: 402,
  usesColor: true,
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const dirty = new DirtyTracker();
    const width = Math.max(3, size * 0.32);
    const w = c.width;
    const h = c.height;

    const pairs: [Point, Point][] = [
      [from, to],
      [{ x: w - from.x, y: from.y }, { x: w - to.x, y: to.y }],
      [{ x: from.x, y: h - from.y }, { x: to.x, y: h - to.y }],
      [{ x: w - from.x, y: h - from.y }, { x: w - to.x, y: h - to.y }],
    ];

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [a, b] of pairs) {
      paintSegment(ctx, a, b, width, c.color, dirty);
    }
    ctx.restore();
    dirty.flush(c);
  },
} satisfies MagicEffect;
