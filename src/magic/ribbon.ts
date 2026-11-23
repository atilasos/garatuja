import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point } from '../core/types';
import { edgeShade, patternPartner, rgba } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';

let remaining = 0;

function drawScallopUnit(ctx: CanvasRenderingContext2D, p: Point, angle: number, size: number, color: string, dirty: DirtyTracker) {
  const halfBand = size * 0.28;
  const scallopR = size * 0.18;
  const rim = edgeShade(color);
  const eyelet = patternPartner(color);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  // Scalloped decorative bumps along both outer edges
  for (const side of [-1, 1]) {
    const cy = side * halfBand;
    ctx.beginPath();
    ctx.arc(0, cy, scallopR, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = rgba(rim, 0.72);
    ctx.lineWidth = Math.max(1, size * 0.035);
    ctx.stroke();

    // Delicate lace eyelet dot
    ctx.beginPath();
    ctx.arc(0, cy + side * scallopR * 0.16, Math.max(1.2, scallopR * 0.34), 0, Math.PI * 2);
    ctx.fillStyle = eyelet;
    ctx.fill();
  }

  // Center satin ribbon strip
  ctx.fillStyle = color;
  ctx.fillRect(-scallopR * 1.05, -halfBand * 0.85, scallopR * 2.1, halfBand * 1.7);

  // Contrasting decorative center stitch dash
  ctx.strokeStyle = eyelet;
  ctx.lineWidth = Math.max(1.5, size * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-scallopR * 0.45, 0);
  ctx.lineTo(scallopR * 0.45, 0);
  ctx.stroke();

  ctx.restore();
  dirty.addPoint(p.x, p.y, halfBand + scallopR + 3);
}

export default {
  id: 'ribbon',
  label: { pt: 'Fita', en: 'Decorative ribbon' },
  hint: { pt: 'Arrasta para bordar uma fita decorativa.', en: 'Drag to trim with decorative lace ribbon.' },
  category: 'pintar',
  level: 2,
  order: 121,
  usesColor: true,
  begin() {
    remaining = 0;
  },
  stroke(from, to, c, size) {
    const dirty = new DirtyTracker();
    const spacing = Math.max(7, size * 0.34);
    if (from.x === to.x && from.y === to.y) {
      drawScallopUnit(c.ctx, to, 0, size, c.color, dirty);
      remaining = spacing;
    } else {
      remaining = interpolateDabs(from, to, spacing, remaining, (p, _f, angle) => {
        drawScallopUnit(c.ctx, p, angle, size, c.color, dirty);
      });
    }
    dirty.flush(c);
  },
} satisfies MagicEffect;
