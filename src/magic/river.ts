import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point } from '../core/types';
import { DirtyTracker } from './_util/c-geom';

let remaining = 0;

function drawRipple(ctx: CanvasRenderingContext2D, p: Point, angle: number, size: number, rand: () => number, dirty: DirtyTracker) {
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  const offset = (rand() - 0.5) * size * 0.58;
  const rx = p.x + nx * offset;
  const ry = p.y + ny * offset;
  const waveLen = size * (0.28 + rand() * 0.2);
  const amp = size * (0.06 + rand() * 0.04);

  ctx.save();
  ctx.translate(rx, ry);
  ctx.rotate(angle);
  ctx.strokeStyle = rand() > 0.35 ? 'rgba(235, 250, 255, 0.82)' : 'rgba(162, 232, 248, 0.78)';
  ctx.lineWidth = Math.max(1.4, size * 0.06);
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
  },
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const dirty = new DirtyTracker();
    const bankW = size * 1.06;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Deeper teal riverbank water
    ctx.strokeStyle = '#2d82a8';
    ctx.lineWidth = bankW;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + 0.05, to.y);
    ctx.stroke();

    // Bright cerulean river body
    ctx.strokeStyle = '#47a9d8';
    ctx.lineWidth = size * 0.86;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + 0.05, to.y);
    ctx.stroke();

    // Sunlit turquoise center current
    ctx.strokeStyle = '#6ec8eb';
    ctx.lineWidth = size * 0.44;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + 0.05, to.y);
    ctx.stroke();
    ctx.restore();
    dirty.addSegment(from, to, bankW * 0.5 + 3);

    const spacing = Math.max(6, size * 0.26);
    if (from.x === to.x && from.y === to.y) {
      drawRipple(ctx, to, 0, size, c.random, dirty);
      remaining = spacing;
    } else {
      remaining = interpolateDabs(from, to, spacing, remaining, (p, _f, angle) => {
        drawRipple(ctx, p, angle, size, c.random, dirty);
      });
    }
    dirty.flush(c);
  },
} satisfies MagicEffect;
