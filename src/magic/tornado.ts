import type { MagicEffect } from '../core/types';
import { warpStroke } from './_util/b-bitmap';

export default {
  id: 'tornado',
  label: { pt: 'Tornado', en: 'Tornado' },
  hint: { pt: 'Arrasta para fazer um remoinho forte que puxa a tinta.', en: 'Drag to make a strong whirl that pulls the paint.' },
  category: 'distorcer', order: 256, level: 2, usesColor: false,
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
      const t = 1 - Math.min(1, dist / radius);
      const angle = t * 2.7;
      const pulled = dist * (1 - t * 0.55);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const px = (dx / dist) * pulled;
      const py = (dy / dist) * pulled;
      out.x = cx + px * cos - py * sin;
      out.y = cy + px * sin + py * cos;
    });
  },
} satisfies MagicEffect;
