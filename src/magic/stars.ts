import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point, ToolContext } from '../core/types';
import { edgeShade, highlightTint, rgba, shiftColor } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';
import { traceStar } from './_util/c-shapes';

let remaining = 0;

function drawStarBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerR: number,
  color: string,
  rot: number,
  dirty: DirtyTracker,
) {
  const innerR = outerR * 0.45;
  ctx.save();
  traceStar(ctx, x, y, 5, outerR, innerR, rot);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = edgeShade(color);
  ctx.lineWidth = Math.max(1, outerR * 0.09);
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Inner bright highlight star
  traceStar(ctx, x - outerR * 0.06, y - outerR * 0.06, 5, outerR * 0.56, innerR * 0.56, rot);
  ctx.fillStyle = rgba(highlightTint(color), 0.48);
  ctx.fill();
  ctx.restore();
  dirty.addPoint(x, y, outerR + Math.max(2, outerR * 0.14));
}

function scatterStars(p: Point, c: ToolContext, size: number, dirty: DirtyTracker) {
  const spread = size * 0.56;
  const count = 2 + Math.floor(c.random() * 2);
  for (let i = 0; i < count; i++) {
    const a = c.random() * Math.PI * 2;
    const d = Math.sqrt(c.random()) * spread;
    const sx = p.x + Math.cos(a) * d;
    const sy = p.y + Math.sin(a) * d;
    const r = size * (i === 0 ? 0.28 + c.random() * 0.16 : 0.12 + c.random() * 0.12);
    const col = shiftColor(c.color, (c.random() - 0.5) * 20, 0.04, (c.random() - 0.45) * 0.14);
    drawStarBadge(c.ctx, sx, sy, r, col, -Math.PI / 2 + (c.random() - 0.5) * 0.8, dirty);
  }
}

export default {
  id: 'stars',
  label: { pt: 'Estrelas', en: 'Stars' },
  hint: { pt: 'Arrasta para espalhar estrelas.', en: 'Drag to scatter stars.' },
  category: 'pintar',
  level: 1,
  order: 111,
  usesColor: true,
  begin() {
    remaining = 0;
  },
  stroke(from, to, c, size) {
    const dirty = new DirtyTracker();
    const spacing = Math.max(8, size * 0.52);
    if (from.x === to.x && from.y === to.y) {
      scatterStars(to, c, size, dirty);
      remaining = spacing;
    } else {
      remaining = interpolateDabs(from, to, spacing, remaining, p => {
        scatterStars(p, c, size, dirty);
      });
    }
    dirty.flush(c);
  },
} satisfies MagicEffect;
