import type { MagicEffect } from '../core/types';
import { warpStroke } from './_util/b-bitmap';

export default {
  id: 'fisheye',
  label: { pt: 'Olho de peixe', en: 'Fisheye' },
  hint: { pt: 'Arrasta para inchar o desenho no meio, como um olho de peixe.', en: 'Drag to bulge the drawing in the middle, like a fisheye.' },
  category: 'distorcer', order: 232, level: 2, usesColor: false,
  stroke(from, to, c, size) {
    const cx = (from.x + to.x) / 2;
    const cy = (from.y + to.y) / 2;
    const radius = Math.max(1, size / 2);
    warpStroke(c, from, to, size, (x, y, out) => {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.001) {
        out.x = x;
        out.y = y;
        return;
      }
      const src = radius * Math.pow(Math.min(1, dist / radius), 1.75);
      out.x = cx + (dx / dist) * src;
      out.y = cy + (dy / dist) * src;
    });
  },
} satisfies MagicEffect;
