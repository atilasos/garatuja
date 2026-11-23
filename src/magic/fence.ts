import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point } from '../core/types';
import { edgeShade, highlightTint, rgba, shiftColor } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';

let remaining = 0;
let lastPost: Point | null = null;

function drawPicket(ctx: CanvasRenderingContext2D, p: Point, size: number, color: string, dirty: DirtyTracker) {
  const halfW = Math.max(3, size * 0.14);
  const topY = p.y - size * 0.56;
  const shoulderY = p.y - size * 0.38;
  const botY = p.y + size * 0.44;
  const rim = edgeShade(color);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p.x, topY);
  ctx.lineTo(p.x + halfW, shoulderY);
  ctx.lineTo(p.x + halfW, botY);
  ctx.lineTo(p.x - halfW, botY);
  ctx.lineTo(p.x - halfW, shoulderY);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = rim;
  ctx.lineWidth = Math.max(1.2, size * 0.035);
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Left sunlit wood edge
  ctx.fillStyle = rgba(highlightTint(color), 0.32);
  ctx.fillRect(p.x - halfW + 1, shoulderY, halfW * 0.65, botY - shoulderY - 1);

  // Two tiny nail heads where cross-rails attach
  ctx.fillStyle = rim;
  for (const offset of [-0.16, 0.2]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y + size * offset, Math.max(1.1, size * 0.035), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  dirty.add({
    x: p.x - halfW - 3,
    y: topY - 3,
    w: halfW * 2 + 6,
    h: botY - topY + 6,
  });
}

function drawRailsBetween(ctx: CanvasRenderingContext2D, a: Point, b: Point, size: number, color: string, dirty: DirtyTracker) {
  const railH = Math.max(2.5, size * 0.11);
  const railColor = shiftColor(color, 0, -0.04, -0.09);
  const rim = edgeShade(color);

  ctx.save();
  ctx.lineCap = 'round';
  for (const offset of [-0.16, 0.2]) {
    const oy = size * offset;
    ctx.strokeStyle = rim;
    ctx.lineWidth = railH + 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y + oy);
    ctx.lineTo(b.x, b.y + oy);
    ctx.stroke();

    ctx.strokeStyle = railColor;
    ctx.lineWidth = railH;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y + oy);
    ctx.lineTo(b.x, b.y + oy);
    ctx.stroke();

    dirty.addSegment({ x: a.x, y: a.y + oy }, { x: b.x, y: b.y + oy }, railH + 3);
  }
  ctx.restore();
}

export default {
  id: 'fence',
  label: { pt: 'Vedação', en: 'Fence' },
  hint: { pt: 'Arrasta para construir uma cerca de madeira.', en: 'Drag to build a wooden picket fence.' },
  category: 'pintar',
  level: 2,
  order: 119,
  usesColor: true,
  begin() {
    remaining = 0;
    lastPost = null;
  },
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const dirty = new DirtyTracker();
    const spacing = Math.max(10, size * 0.42);

    if (from.x === to.x && from.y === to.y) {
      drawPicket(ctx, to, size, c.color, dirty);
      lastPost = { x: to.x, y: to.y };
      remaining = spacing;
    } else {
      remaining = interpolateDabs(from, to, spacing, remaining, p => {
        if (lastPost) drawRailsBetween(ctx, lastPost, p, size, c.color, dirty);
        if (lastPost) drawPicket(ctx, lastPost, size, c.color, dirty);
        drawPicket(ctx, p, size, c.color, dirty);
        lastPost = { x: p.x, y: p.y };
      });
    }
    dirty.flush(c);
  },
} satisfies MagicEffect;
