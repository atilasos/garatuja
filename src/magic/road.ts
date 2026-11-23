import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point } from '../core/types';
import { DirtyTracker } from './_util/c-geom';

let travelled = 0;
let remaining = 0;

function drawDash(ctx: CanvasRenderingContext2D, p: Point, angle: number, size: number, dirty: DirtyTracker) {
  const halfLen = size * 0.16;
  const width = Math.max(2, size * 0.09);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.fillStyle = '#f8d85c';
  ctx.fillRect(-halfLen, -width / 2, halfLen * 2, width);
  ctx.restore();
  dirty.addPoint(p.x, p.y, halfLen + width + 2);
}

export default {
  id: 'road',
  label: { pt: 'Estrada', en: 'Road' },
  hint: { pt: 'Arrasta para desenhar uma estrada com tracejado.', en: 'Drag to draw a road with center dashes.' },
  category: 'pintar',
  level: 2,
  order: 115,
  usesColor: false,
  begin() {
    travelled = 0;
    remaining = 0;
  },
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const dirty = new DirtyTracker();
    const curbW = size + Math.max(4, size * 0.16);
    const roadW = size;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Pale stone shoulder / curb edges
    ctx.strokeStyle = '#c8cdd4';
    ctx.lineWidth = curbW;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + 0.05, to.y);
    ctx.stroke();

    // Dark slate asphalt
    ctx.strokeStyle = '#484d57';
    ctx.lineWidth = roadW;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + 0.05, to.y);
    ctx.stroke();

    // Crisp white inner lane edge whisper
    ctx.strokeStyle = '#575d68';
    ctx.lineWidth = roadW * 0.84;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + 0.05, to.y);
    ctx.stroke();

    ctx.restore();
    dirty.addSegment(from, to, curbW * 0.5 + 3);

    // Centered yellow dashed markings spaced evenly along travelled distance
    const dashPeriod = Math.max(12, size * 0.62);
    if (dist < 0.5) {
      drawDash(ctx, to, 0, size, dirty);
      remaining = dashPeriod;
    } else {
      remaining = interpolateDabs(from, to, dashPeriod, remaining, (p, _f, angle) => {
        drawDash(ctx, p, angle, size, dirty);
      });
      travelled += dist;
    }
    void travelled;
    dirty.flush(c);
  },
} satisfies MagicEffect;
