import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point, ToolContext } from '../core/types';
import { DirtyTracker } from './_util/c-geom';

let remaining = 0;

function drawFlameTongue(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  width: number,
  height: number,
  sway: number,
  color: string,
  dirty: DirtyTracker,
) {
  const tipX = bx + sway;
  const tipY = by - height;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(bx, by + width * 0.35);
  ctx.bezierCurveTo(
    bx - width * 0.85, by + width * 0.05,
    bx - width * 0.55 + sway * 0.4, by - height * 0.55,
    tipX, tipY,
  );
  ctx.bezierCurveTo(
    bx + width * 0.55 + sway * 0.4, by - height * 0.55,
    bx + width * 0.85, by + width * 0.05,
    bx, by + width * 0.35,
  );
  ctx.closePath();
  ctx.fill();

  const minX = Math.min(bx - width, tipX - width * 0.5) - 2;
  const maxX = Math.max(bx + width, tipX + width * 0.5) + 2;
  const minY = tipY - 2;
  const maxY = by + width * 0.45 + 2;
  dirty.add({ x: minX, y: minY, w: maxX - minX, h: maxY - minY });
}

function drawFireCluster(p: Point, c: ToolContext, size: number, dirty: DirtyTracker) {
  const ctx = c.ctx;
  const tongues = 3;
  ctx.save();
  for (let i = 0; i < tongues; i++) {
    const ox = (c.random() - 0.5) * size * 0.56;
    const oy = (c.random() - 0.5) * size * 0.16;
    const h = size * (0.65 + c.random() * 0.58);
    const w = size * (0.24 + c.random() * 0.14);
    const sway = (c.random() - 0.5) * size * 0.42;
    const bx = p.x + ox;
    const by = p.y + oy;

    // Outer crimson-vermilion flame
    drawFlameTongue(ctx, bx, by, w, h, sway, '#d93d26', dirty);
    // Middle vibrant tangerine flame
    drawFlameTongue(ctx, bx, by, w * 0.72, h * 0.76, sway * 0.75, '#f58220', dirty);
    // Bright golden core
    drawFlameTongue(ctx, bx, by, w * 0.42, h * 0.48, sway * 0.45, '#ffdf59', dirty);
  }

  // Rising glowing ember sparks
  for (let i = 0; i < 2; i++) {
    const ex = p.x + (c.random() - 0.5) * size * 0.9;
    const ey = p.y - size * (0.75 + c.random() * 0.7);
    const er = Math.max(1.2, size * (0.03 + c.random() * 0.035));
    ctx.fillStyle = i === 0 ? '#ffcf40' : '#f26a21';
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fill();
    dirty.addPoint(ex, ey, er + 2);
  }
  ctx.restore();
}

export default {
  id: 'fire',
  label: { pt: 'Fogo', en: 'Fire' },
  hint: { pt: 'Arrasta para pintar chamas vivas.', en: 'Drag to paint lively flames.' },
  category: 'pintar',
  level: 2,
  order: 117,
  usesColor: false,
  begin() {
    remaining = 0;
  },
  stroke(from, to, c, size) {
    const dirty = new DirtyTracker();
    const spacing = Math.max(6, size * 0.34);
    if (from.x === to.x && from.y === to.y) {
      drawFireCluster(to, c, size, dirty);
      remaining = spacing;
    } else {
      remaining = interpolateDabs(from, to, spacing, remaining, p => {
        drawFireCluster(p, c, size, dirty);
      });
    }
    dirty.flush(c);
  },
} satisfies MagicEffect;
