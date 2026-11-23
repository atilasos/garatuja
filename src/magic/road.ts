import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point } from '../core/types';
import { DirtyTracker } from './_util/c-geom';

let remaining = 0;
let prevLeft: Point | null = null;
let prevRight: Point | null = null;

function drawDash(ctx: CanvasRenderingContext2D, p: Point, angle: number, size: number, dirty: DirtyTracker) {
  const halfLen = size * 0.17;
  const width = Math.max(2.2, size * 0.095);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.fillStyle = '#fae06b';
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
    remaining = 0;
    prevLeft = null;
    prevRight = null;
  },
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const dirty = new DirtyTracker();
    const halfW = size * 0.48;
    const curbW = Math.max(2.5, size * 0.1);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (dist < 0.5) {
      // Tap draws a short smooth road patch with curb edges & one dash
      ctx.fillStyle = '#484d57';
      ctx.beginPath();
      ctx.arc(to.x, to.y, halfW, 0, Math.PI * 2);
      ctx.fill();
      drawDash(ctx, to, 0, size, dirty);
      dirty.addPoint(to.x, to.y, halfW + curbW + 3);
      remaining = Math.max(12, size * 0.62);
      ctx.restore();
      dirty.flush(c);
      return;
    }

    const nx = -dy / dist;
    const ny = dx / dist;
    const curLeft: Point = { x: to.x + nx * halfW, y: to.y + ny * halfW };
    const curRight: Point = { x: to.x - nx * halfW, y: to.y - ny * halfW };
    const startLeft = prevLeft ?? { x: from.x + nx * halfW, y: from.y + ny * halfW };
    const startRight = prevRight ?? { x: from.x - nx * halfW, y: from.y - ny * halfW };

    // Seamless dark slate asphalt polygon + soft endcap only at leading tip (never re-draws curb across interior)
    ctx.fillStyle = '#484d57';
    ctx.beginPath();
    ctx.moveTo(startLeft.x, startLeft.y);
    ctx.lineTo(curLeft.x, curLeft.y);
    ctx.lineTo(curRight.x, curRight.y);
    ctx.lineTo(startRight.x, startRight.y);
    ctx.closePath();
    ctx.fill();

    // Forward-facing semicircle at leading tip so turns stay smooth without erasing earlier dashes
    const fwdAngle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.arc(to.x, to.y, halfW, fwdAngle - Math.PI / 2, fwdAngle + Math.PI / 2);
    ctx.fill();

    // Pale stone shoulder curbs strictly along the two outer edges
    ctx.strokeStyle = '#cfd4dc';
    ctx.lineWidth = curbW;
    ctx.beginPath();
    ctx.moveTo(startLeft.x, startLeft.y);
    ctx.lineTo(curLeft.x, curLeft.y);
    ctx.moveTo(startRight.x, startRight.y);
    ctx.lineTo(curRight.x, curRight.y);
    ctx.stroke();

    // Subtle inner road shoulder pinstripes
    const laneFrac = 0.84;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = Math.max(1, size * 0.03);
    ctx.beginPath();
    ctx.moveTo(from.x + nx * halfW * laneFrac, from.y + ny * halfW * laneFrac);
    ctx.lineTo(to.x + nx * halfW * laneFrac, to.y + ny * halfW * laneFrac);
    ctx.moveTo(from.x - nx * halfW * laneFrac, from.y - ny * halfW * laneFrac);
    ctx.lineTo(to.x - nx * halfW * laneFrac, to.y - ny * halfW * laneFrac);
    ctx.stroke();

    ctx.restore();
    dirty.addSegment(startLeft, curLeft, curbW + 3);
    dirty.addSegment(startRight, curRight, curbW + 3);
    dirty.addSegment(from, to, halfW + curbW + 3);

    // Centered yellow dashed lane markings on top of asphalt
    const dashPeriod = Math.max(12, size * 0.62);
    remaining = interpolateDabs(from, to, dashPeriod, remaining, (p, _f, angle) => {
      drawDash(ctx, p, angle, size, dirty);
    });

    prevLeft = curLeft;
    prevRight = curRight;
    dirty.flush(c);
  },
} satisfies MagicEffect;
