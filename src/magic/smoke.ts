import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point, ToolContext } from '../core/types';
import { DirtyTracker } from './_util/c-geom';

let remaining = 0;

function drawSmokePuff(p: Point, c: ToolContext, size: number, dirty: DirtyTracker) {
  const ctx = c.ctx;
  ctx.save();
  // Layered billowing wisps rising slightly upward
  for (let i = 0; i < 4; i++) {
    const driftY = -size * (i * 0.14 + c.random() * 0.22);
    const driftX = (c.random() - 0.48) * size * (0.4 + i * 0.18);
    const x = p.x + driftX;
    const y = p.y + driftY;
    const r = size * (0.28 + i * 0.08 + c.random() * 0.16);
    const shade = 128 + Math.floor(c.random() * 52);

    const grad = ctx.createRadialGradient(x - r * 0.12, y - r * 0.12, r * 0.06, x, y, r);
    grad.addColorStop(0, `rgba(${shade}, ${shade + 5}, ${shade + 12}, 0.34)`);
    grad.addColorStop(0.55, `rgba(${shade + 22}, ${shade + 26}, ${shade + 32}, 0.2)`);
    grad.addColorStop(1, `rgba(${shade + 35}, ${shade + 38}, ${shade + 42}, 0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    dirty.addPoint(x, y, r + 2);
  }
  ctx.restore();
}

export default {
  id: 'smoke',
  label: { pt: 'Fumo', en: 'Smoke' },
  hint: { pt: 'Arrasta para libertar nuvens de fumo.', en: 'Drag to release puffs of smoke.' },
  category: 'pintar',
  level: 2,
  order: 118,
  usesColor: false,
  begin() {
    remaining = 0;
  },
  stroke(from, to, c, size) {
    const dirty = new DirtyTracker();
    const spacing = Math.max(7, size * 0.36);
    if (from.x === to.x && from.y === to.y) {
      drawSmokePuff(to, c, size, dirty);
      remaining = spacing;
    } else {
      remaining = interpolateDabs(from, to, spacing, remaining, p => {
        drawSmokePuff(p, c, size, dirty);
      });
    }
    dirty.flush(c);
  },
} satisfies MagicEffect;
