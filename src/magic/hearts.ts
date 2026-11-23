import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point, ToolContext } from '../core/types';
import { edgeShade, highlightTint, rgba, shiftColor } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';
import { traceHeart } from './_util/c-shapes';

let remaining = 0;

function drawHeartBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  rot: number,
  dirty: DirtyTracker,
) {
  ctx.save();
  traceHeart(ctx, x, y, radius, rot);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = edgeShade(color);
  ctx.lineWidth = Math.max(1, radius * 0.09);
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Cute glossy highlight on left lobe
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = rgba(highlightTint(color), 0.72);
  ctx.beginPath();
  ctx.ellipse(-radius * 0.4, -radius * 0.32, radius * 0.18, radius * 0.1, -0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  dirty.addPoint(x, y, radius * 1.15 + 3);
}

function scatterHearts(p: Point, c: ToolContext, size: number, dirty: DirtyTracker) {
  const spread = size * 0.52;
  const count = 1 + (c.random() > 0.35 ? 1 : 0);
  for (let i = 0; i < count; i++) {
    const a = c.random() * Math.PI * 2;
    const d = Math.sqrt(c.random()) * spread;
    const hx = p.x + Math.cos(a) * d;
    const hy = p.y + Math.sin(a) * d;
    const r = size * (i === 0 ? 0.28 + c.random() * 0.16 : 0.14 + c.random() * 0.1);
    const col = shiftColor(c.color, (c.random() - 0.5) * 16, 0.03, (c.random() - 0.45) * 0.14);
    drawHeartBadge(c.ctx, hx, hy, r, col, (c.random() - 0.5) * 0.6, dirty);
  }
}

export default {
  id: 'hearts',
  label: { pt: 'Corações', en: 'Hearts' },
  hint: { pt: 'Arrasta para espalhar corações.', en: 'Drag to scatter hearts.' },
  category: 'pintar',
  level: 1,
  order: 112,
  usesColor: true,
  begin() {
    remaining = 0;
  },
  stroke(from, to, c, size) {
    const dirty = new DirtyTracker();
    const spacing = Math.max(8, size * 0.52);
    if (from.x === to.x && from.y === to.y) {
      scatterHearts(to, c, size, dirty);
      remaining = spacing;
    } else {
      remaining = interpolateDabs(from, to, spacing, remaining, p => {
        scatterHearts(p, c, size, dirty);
      });
    }
    dirty.flush(c);
  },
} satisfies MagicEffect;
