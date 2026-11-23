import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point, ToolContext } from '../core/types';
import { DirtyTracker } from './_util/c-geom';

let remaining = 0;
const slant = 0.28; // Slanted downward-left rain angle

function drawRaindrop(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, dirty: DirtyTracker) {
  const rad = Math.max(1.6, len * 0.17);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(slant);

  // Slanted water teardrop: pointed tail at top, rounded drop at bottom
  const grad = ctx.createLinearGradient(0, -len * 0.65, 0, len * 0.35);
  grad.addColorStop(0, 'rgba(130, 195, 245, 0.22)');
  grad.addColorStop(0.55, 'rgba(72, 146, 218, 0.78)');
  grad.addColorStop(1, 'rgba(42, 108, 182, 0.92)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -len * 0.65);
  ctx.bezierCurveTo(rad * 0.9, -len * 0.1, rad * 1.15, len * 0.28, 0, len * 0.36);
  ctx.bezierCurveTo(-rad * 1.15, len * 0.28, -rad * 0.9, -len * 0.1, 0, -len * 0.65);
  ctx.closePath();
  ctx.fill();

  // Bright watery highlight
  ctx.fillStyle = 'rgba(236, 249, 255, 0.85)';
  ctx.beginPath();
  ctx.ellipse(-rad * 0.26, len * 0.12, rad * 0.22, rad * 0.42, 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  dirty.addPoint(x, y, len * 0.75 + rad + 2);
}

function scatterRain(p: Point, c: ToolContext, size: number, dirty: DirtyTracker) {
  const spread = size * 0.68;
  const count = 3 + Math.floor(c.random() * 3);
  for (let i = 0; i < count; i++) {
    const rx = p.x + (c.random() - 0.5) * spread * 2;
    const ry = p.y + (c.random() - 0.5) * spread * 2;
    const len = size * (0.34 + c.random() * 0.36);
    drawRaindrop(c.ctx, rx, ry, len, dirty);
  }
}

export default {
  id: 'rain',
  label: { pt: 'Chuva', en: 'Rain' },
  hint: { pt: 'Arrasta para pintar gotas de chuva.', en: 'Drag to paint falling raindrops.' },
  category: 'pintar',
  level: 2,
  order: 110,
  usesColor: false,
  begin() {
    remaining = 0;
  },
  stroke(from, to, c, size) {
    const dirty = new DirtyTracker();
    const spacing = Math.max(8, size * 0.45);
    if (from.x === to.x && from.y === to.y) {
      scatterRain(to, c, size, dirty);
      remaining = spacing;
    } else {
      remaining = interpolateDabs(from, to, spacing, remaining, p => {
        scatterRain(p, c, size, dirty);
      });
    }
    dirty.flush(c);
  },
} satisfies MagicEffect;
