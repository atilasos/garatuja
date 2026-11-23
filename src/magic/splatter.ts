import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point, ToolContext } from '../core/types';
import { edgeShade, highlightTint, rgba, shiftColor } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';

let remaining = 0;

function drawSplat(p: Point, c: ToolContext, size: number, dirty: DirtyTracker) {
  const ctx = c.ctx;
  const col = shiftColor(c.color, (c.random() - 0.5) * 10, 0.02, (c.random() - 0.5) * 0.08);
  const coreR = size * (0.18 + c.random() * 0.18);
  const cx = p.x + (c.random() - 0.5) * size * 0.45;
  const cy = p.y + (c.random() - 0.5) * size * 0.45;

  ctx.save();
  ctx.fillStyle = col;

  // Irregular organic main blob built from overlapping lobes
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fill();
  dirty.addPoint(cx, cy, coreR + 2);

  const lobes = 4 + Math.floor(c.random() * 4);
  for (let i = 0; i < lobes; i++) {
    const a = (i * Math.PI * 2) / lobes + (c.random() - 0.5) * 0.5;
    const dist = coreR * (0.55 + c.random() * 0.65);
    const lr = coreR * (0.3 + c.random() * 0.35);
    const lx = cx + Math.cos(a) * dist;
    const ly = cy + Math.sin(a) * dist;
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, Math.PI * 2);
    ctx.fill();
    dirty.addPoint(lx, ly, lr + 2);
  }

  // Wet-paint specular highlight on main drop
  ctx.fillStyle = rgba(highlightTint(col), 0.55);
  ctx.beginPath();
  ctx.ellipse(cx - coreR * 0.25, cy - coreR * 0.25, coreR * 0.28, coreR * 0.16, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Flying satellite splash droplets radiating outward
  const drops = 5 + Math.floor(c.random() * 5);
  for (let i = 0; i < drops; i++) {
    const a = c.random() * Math.PI * 2;
    const dist = coreR * 1.1 + c.random() * size * 0.72;
    const dr = Math.max(1.2, size * (0.03 + c.random() * 0.085));
    const dx = cx + Math.cos(a) * dist;
    const dy = cy + Math.sin(a) * dist;
    ctx.fillStyle = i % 3 === 0 ? edgeShade(col) : col;
    ctx.beginPath();
    ctx.ellipse(dx, dy, dr * 1.25, dr * 0.85, a, 0, Math.PI * 2);
    ctx.fill();
    dirty.addPoint(dx, dy, dr * 1.4 + 2);
  }
  ctx.restore();
}

export default {
  id: 'splatter',
  label: { pt: 'Salpicos', en: 'Paint splatter' },
  hint: { pt: 'Arrasta para salpicar gotas de tinta.', en: 'Drag to splatter drops of paint.' },
  category: 'pintar',
  level: 2,
  order: 129,
  usesColor: true,
  begin() {
    remaining = 0;
  },
  stroke(from, to, c, size) {
    const dirty = new DirtyTracker();
    const spacing = Math.max(8, size * 0.55);
    if (from.x === to.x && from.y === to.y) {
      drawSplat(to, c, size, dirty);
      remaining = spacing;
    } else {
      remaining = interpolateDabs(from, to, spacing, remaining, p => {
        drawSplat(p, c, size, dirty);
      });
    }
    dirty.flush(c);
  },
} satisfies MagicEffect;
