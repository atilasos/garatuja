import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point, ToolContext } from '../core/types';
import { DirtyTracker } from './_util/c-geom';

let remaining = 0;

function drawCloudPuff(p: Point, c: ToolContext, size: number, dirty: DirtyTracker) {
  const ctx = c.ctx;
  const r = size * (0.42 + c.random() * 0.22);
  const bumps = [
    { dx: -r * 0.52, dy: r * 0.14, rad: r * 0.58 },
    { dx: r * 0.5, dy: r * 0.16, rad: r * 0.54 },
    { dx: -r * 0.15, dy: -r * 0.2, rad: r * 0.68 },
    { dx: r * 0.22, dy: -r * 0.12, rad: r * 0.56 },
    { dx: 0, dy: r * 0.14, rad: r * 0.64 },
  ];

  ctx.save();
  // Soft sky-blue outer whisper so clouds stay legible on white paper
  ctx.fillStyle = 'rgba(164, 189, 214, 0.35)';
  for (const b of bumps) {
    ctx.beginPath();
    ctx.arc(p.x + b.dx, p.y + b.dy + r * 0.1, b.rad + 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cool shaded underside
  ctx.fillStyle = '#dce6f2';
  for (const b of bumps) {
    ctx.beginPath();
    ctx.arc(p.x + b.dx, p.y + b.dy + r * 0.08, b.rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Warm soft main cloud body
  ctx.fillStyle = '#f5f8fc';
  for (const b of bumps) {
    ctx.beginPath();
    ctx.arc(p.x + b.dx, p.y + b.dy - r * 0.02, b.rad * 0.92, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bright sunlit top crown
  ctx.fillStyle = '#ffffff';
  for (let i = 2; i <= 3; i++) {
    const b = bumps[i];
    ctx.beginPath();
    ctx.arc(p.x + b.dx, p.y + b.dy - r * 0.1, b.rad * 0.72, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  dirty.addPoint(p.x, p.y, r * 1.35 + 4);
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
    const spacing = Math.max(8, size * 0.38);
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
