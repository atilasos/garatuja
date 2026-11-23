import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point, ToolContext } from '../core/types';
import { DirtyTracker } from './_util/c-geom';

let remaining = 0;

function drawCloudPuff(p: Point, c: ToolContext, size: number, dirty: DirtyTracker) {
  const ctx = c.ctx;
  const r = size * (0.48 + c.random() * 0.28);
  const driftX = (c.random() - 0.5) * size * 0.35;
  const driftY = (c.random() - 0.5) * size * 0.25;
  const cx = p.x + driftX;
  const cy = p.y + driftY;

  const bumps = [
    { dx: -r * 0.62, dy: r * 0.16, rad: r * (0.45 + c.random() * 0.14) },
    { dx: r * 0.6, dy: r * 0.18, rad: r * (0.42 + c.random() * 0.14) },
    { dx: -r * 0.22, dy: -r * 0.22, rad: r * (0.58 + c.random() * 0.16) },
    { dx: r * 0.24, dy: -r * 0.14, rad: r * (0.5 + c.random() * 0.14) },
    { dx: 0, dy: r * 0.16, rad: r * 0.56 },
  ];

  ctx.save();
  // Soft cool-sky outer rim so clouds read clearly on white paper too
  ctx.fillStyle = 'rgba(155, 184, 214, 0.38)';
  for (const b of bumps) {
    ctx.beginPath();
    ctx.arc(cx + b.dx, cy + b.dy + r * 0.1, b.rad + 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Shaded soft blue-grey cumulus underbelly
  ctx.fillStyle = '#d7e3f0';
  for (const b of bumps) {
    ctx.beginPath();
    ctx.arc(cx + b.dx, cy + b.dy + r * 0.09, b.rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Soft creamy-white main billow
  ctx.fillStyle = '#f6f9fd';
  for (const b of bumps) {
    ctx.beginPath();
    ctx.arc(cx + b.dx, cy + b.dy - r * 0.03, b.rad * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sunlit bright white upper domes
  ctx.fillStyle = '#ffffff';
  for (let i = 2; i <= 3; i++) {
    const b = bumps[i];
    ctx.beginPath();
    ctx.arc(cx + b.dx, cy + b.dy - r * 0.12, b.rad * 0.72, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  dirty.addPoint(cx, cy, r * 1.45 + 4);
}

export default {
  id: 'clouds',
  label: { pt: 'Nuvens', en: 'Clouds' },
  hint: { pt: 'Arrasta para pintar nuvens fofas.', en: 'Drag to paint fluffy clouds.' },
  category: 'pintar',
  level: 2,
  order: 108,
  usesColor: false,
  begin() {
    remaining = 0;
  },
  stroke(from, to, c, size) {
    const dirty = new DirtyTracker();
    const spacing = Math.max(12, size * 0.65);
    if (from.x === to.x && from.y === to.y) {
      drawCloudPuff(to, c, size, dirty);
      remaining = spacing;
    } else {
      remaining = interpolateDabs(from, to, spacing, remaining, p => {
        drawCloudPuff(p, c, size, dirty);
      });
    }
    dirty.flush(c);
  },
} satisfies MagicEffect;
