import type { MagicEffect, Point } from '../core/types';
import { warpStroke } from './_util/b-bitmap';

let origin: Point = { x: 0, y: 0 };

export default {
  id: 'ripple',
  label: { pt: 'Ondulações', en: 'Ripples' },
  hint: { pt: 'Arrasta para fazer ondas à volta do sítio que tocas.', en: 'Drag to make waves around the place you touch.' },
  category: 'distorcer', order: 220, level: 2, usesColor: false,
  begin(p) { origin = { x: p.x, y: p.y }; },
  stroke(from, to, c, size) {
    const center = origin.x || origin.y ? origin : from;
    warpStroke(c, from, to, size, (x, y, out) => {
      const dx = x - center.x;
      const dy = y - center.y;
      const dist = Math.hypot(dx, dy) || 1;
      const wave = Math.sin(dist * 0.45) * size * 0.11;
      out.x = x + (dx / dist) * wave;
      out.y = y + (dy / dist) * wave;
    });
  },
} satisfies MagicEffect;
