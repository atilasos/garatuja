import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point, ToolContext } from '../core/types';
import { edgeShade, mixColors, rgba, shiftColor } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';

let remaining = 0;

function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  tint: string,
  dirty: DirtyTracker,
) {
  ctx.save();
  // Translucent glossy body
  const fill = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.08, x, y, r);
  fill.addColorStop(0, 'rgba(255, 255, 255, 0.78)');
  fill.addColorStop(0.55, rgba(mixColors(tint, '#d9f4ff', 0.55), 0.32));
  fill.addColorStop(0.88, rgba(tint, 0.45));
  fill.addColorStop(1, rgba(edgeShade(tint), 0.7));
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Shimmering outer rim
  ctx.strokeStyle = rgba(edgeShade(tint), 0.72);
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.stroke();

  // Subtle pastel iridescent inner crescent at bottom-right
  ctx.strokeStyle = rgba(shiftColor(tint, 75, 0.15, 0.2), 0.55);
  ctx.lineWidth = Math.max(1, r * 0.11);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.76, 0.25, 1.45);
  ctx.stroke();

  // Crisp white specular highlight at top-left
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.34, y - r * 0.34, r * 0.24, r * 0.14, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - r * 0.12, y - r * 0.54, Math.max(0.8, r * 0.08), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  dirty.addPoint(x, y, r + Math.max(2, r * 0.12));
}

function drawFoamCluster(p: Point, c: ToolContext, size: number, dirty: DirtyTracker) {
  const count = 3 + Math.floor(c.random() * 3);
  for (let i = 0; i < count; i++) {
    const spread = size * 0.52;
    const angle = c.random() * Math.PI * 2;
    const dist = Math.sqrt(c.random()) * spread;
    const bx = p.x + Math.cos(angle) * dist;
    const by = p.y + Math.sin(angle) * dist;
    const r = size * (i === 0 ? 0.24 + c.random() * 0.16 : 0.08 + c.random() * 0.14);
    const tint = shiftColor(c.color, (c.random() - 0.5) * 35, 0, 0.1);
    drawBubble(c.ctx, bx, by, r, tint, dirty);
  }
}

export default {
  id: 'foam',
  label: { pt: 'Espuma', en: 'Foam' },
  hint: { pt: 'Arrasta para criar bolhas de espuma.', en: 'Drag to blow foamy bubbles.' },
  category: 'pintar',
  level: 1,
  order: 107,
  usesColor: true,
  begin() {
    remaining = 0;
  },
  stroke(from, to, c, size) {
    const dirty = new DirtyTracker();
    const spacing = Math.max(7, size * 0.42);
    if (from.x === to.x && from.y === to.y) {
      drawFoamCluster(to, c, size, dirty);
      remaining = spacing;
    } else {
      remaining = interpolateDabs(from, to, spacing, remaining, p => {
        drawFoamCluster(p, c, size, dirty);
      });
    }
    dirty.flush(c);
  },
} satisfies MagicEffect;
