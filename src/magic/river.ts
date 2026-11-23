import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point } from '../core/types';
import { DirtyTracker } from './_util/c-geom';

let remaining = 0;
let prevLeft: Point | null = null;
let prevRight: Point | null = null;

function drawRipple(ctx: CanvasRenderingContext2D, p: Point, angle: number, size: number, rand: () => number, dirty: DirtyTracker) {
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  const offset = (rand() - 0.5) * size * 0.56;
  const rx = p.x + nx * offset;
  const ry = p.y + ny * offset;
  const waveLen = size * (0.28 + rand() * 0.22);
  const amp = size * (0.065 + rand() * 0.045);

  ctx.save();
  ctx.translate(rx, ry);
  ctx.rotate(angle);
  ctx.strokeStyle = rand() > 0.3 ? 'rgba(240, 252, 255, 0.88)' : 'rgba(174, 236, 252, 0.82)';
  ctx.lineWidth = Math.max(1.5, size * 0.062);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-waveLen * 0.5, 0);
  ctx.quadraticCurveTo(-waveLen * 0.25, -amp, 0, 0);
  ctx.quadraticCurveTo(waveLen * 0.25, amp, waveLen * 0.5, 0);
  ctx.stroke();
  ctx.restore();
  dirty.addPoint(rx, ry, waveLen * 0.6 + amp + 3);
}

export default {
  id: 'river',
  label: { pt: 'Rio', en: 'River' },
  hint: { pt: 'Arrasta para pintar um rio com ondinhas.', en: 'Drag to paint a rippling river.' },
  category: 'pintar',
  level: 2,
  order: 116,
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
    const bankW = Math.max(2.5, size * 0.11);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (dist < 0.5) {
      ctx.fillStyle = '#47a9d8';
      ctx.beginPath();
      ctx.arc(to.x, to.y, halfW, 0, Math.PI * 2);
      ctx.fill();
      drawRipple(ctx, to, 0, size, c.random, dirty);
      dirty.addPoint(to.x, to.y, halfW + bankW + 3);
      remaining = Math.max(6, size * 0.24);
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

    // Smooth cerulean river body without overlapping dark-bank endcaps
    ctx.fillStyle = '#47a9d8';
    ctx.beginPath();
    ctx.moveTo(startLeft.x, startLeft.y);
    ctx.lineTo(curLeft.x, curLeft.y);
    ctx.lineTo(curRight.x, curRight.y);
    ctx.lineTo(startRight.x, startRight.y);
    ctx.closePath();
    ctx.fill();
    const fwdAngle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.arc(to.x, to.y, halfW, fwdAngle - Math.PI / 2, fwdAngle + Math.PI / 2);
    ctx.fill();

    // Sunlit turquoise current down the center
    ctx.strokeStyle = '#6ec8eb';
    ctx.lineWidth = size * 0.46;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Deeper teal riverbank edges along the left & right boundaries
    ctx.strokeStyle = '#2d82a8';
    ctx.lineWidth = bankW;
    ctx.beginPath();
    ctx.moveTo(startLeft.x, startLeft.y);
    ctx.lineTo(curLeft.x, curLeft.y);
    ctx.moveTo(startRight.x, startRight.y);
    ctx.lineTo(curRight.x, curRight.y);
    ctx.stroke();

    ctx.restore();
    dirty.addSegment(startLeft, curLeft, bankW + 3);
    dirty.addSegment(startRight, curRight, bankW + 3);
    dirty.addSegment(from, to, halfW + bankW + 3);

    const spacing = Math.max(6, size * 0.24);
    remaining = interpolateDabs(from, to, spacing, remaining, (p, _f, angle) => {
      drawRipple(ctx, p, angle, size, c.random, dirty);
    });

    prevLeft = curLeft;
    prevRight = curRight;
    dirty.flush(c);
  },
} satisfies MagicEffect;
