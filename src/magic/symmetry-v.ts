import type { MagicEffect, Point } from '../core/types';
import { edgeShade, highlightTint, rgba } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';

function drawTwinStroke(ctx: CanvasRenderingContext2D, a: Point, b: Point, width: number, color: string, dirty: DirtyTracker) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = edgeShade(color);
  ctx.lineWidth = width + 2;
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

  ctx.strokeStyle = rgba(highlightTint(color), 0.35);
  ctx.lineWidth = Math.max(1, width * 0.3);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x + 0.05, b.y);
  ctx.stroke();

  ctx.restore();
  dirty.addSegment(a, b, width * 0.5 + 3);
}

export default {
  id: 'symmetry-v',
  label: { pt: 'Simetria em 2', en: '2-way symmetry' },
  hint: { pt: 'Arrasta de um lado para pintar igual do outro.', en: 'Drag on one side to paint a mirror twin on the other.' },
  category: 'padroes',
  level: 1,
  order: 401,
  usesColor: true,
  stroke(from, to, c, size) {
    const dirty = new DirtyTracker();
    const width = Math.max(3, size * 0.36);
    const mf: Point = { x: c.width - from.x, y: from.y };
    const mt: Point = { x: c.width - to.x, y: to.y };

    drawTwinStroke(c.ctx, from, to, width, c.color, dirty);
    drawTwinStroke(c.ctx, mf, mt, width, c.color, dirty);
    dirty.flush(c);
  },
} satisfies MagicEffect;
