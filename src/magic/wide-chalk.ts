import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point, ToolContext } from '../core/types';
import { highlightTint, rgba } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';

const stickAngle = -0.35;
let remaining = 0;

function rubChalk(p: Point, c: ToolContext, size: number, dirty: DirtyTracker) {
  const ctx = c.ctx;
  const halfLen = size * 0.56;
  const halfThick = size * 0.2;
  const cos = Math.cos(stickAngle);
  const sin = Math.sin(stickAngle);
  const grains = Math.max(24, Math.round(size * 1.15));
  const dustLight = highlightTint(c.color);

  ctx.save();
  for (let i = 0; i < grains; i++) {
    // Triangular distribution makes chalk denser inside the stick footprint, powdery at edges
    const u = (c.random() - 0.5) * 2 * halfLen;
    const v = ((c.random() + c.random()) * 0.5 - 0.5) * 2 * halfThick;
    const gx = p.x + u * cos - v * sin;
    const gy = p.y + u * sin + v * cos;
    const rad = Math.max(0.8, size * (0.025 + c.random() * 0.045));
    const alpha = 0.22 + c.random() * 0.45;
    ctx.fillStyle = c.random() > 0.8 ? rgba(dustLight, alpha * 0.8) : rgba(c.color, alpha);
    ctx.fillRect(gx - rad * 0.5, gy - rad * 0.5, rad * (0.8 + c.random() * 0.9), rad * (0.7 + c.random() * 0.8));
  }
  ctx.restore();

  dirty.addPoint(p.x, p.y, Math.hypot(halfLen, halfThick) + size * 0.1 + 3);
}

export default {
  id: 'wide-chalk',
  label: { pt: 'Giz largo', en: 'Wide chalk' },
  hint: { pt: 'Arrasta para riscar com um pau de giz largo.', en: 'Drag to rub with a wide stick of chalk.' },
  category: 'pintar',
  level: 2,
  order: 127,
  usesColor: true,
  begin() {
    remaining = 0;
  },
  stroke(from, to, c, size) {
    const dirty = new DirtyTracker();
    const spacing = Math.max(2.5, size * 0.14);
    if (from.x === to.x && from.y === to.y) {
      rubChalk(to, c, size, dirty);
      remaining = spacing;
    } else {
      remaining = interpolateDabs(from, to, spacing, remaining, p => {
        rubChalk(p, c, size, dirty);
      });
    }
    dirty.flush(c);
  },
} satisfies MagicEffect;
