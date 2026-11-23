import type { MagicEffect } from '../core/types';
import { warpStroke } from './_util/b-bitmap';

export default {
  id: 'drip',
  label: { pt: 'Pingar', en: 'Drip' },
  hint: { pt: 'Arrasta para a tinta escorrer para baixo.', en: 'Drag to let the paint drip downward.' },
  category: 'distorcer', order: 240, level: 2, usesColor: false,
  stroke(from, to, c, size) {
    const radius = Math.max(1, size / 2);
    const top = Math.min(from.y, to.y) - radius;
    warpStroke(c, from, to, size, (x, y, out) => {
      const depth = Math.max(0, Math.min(1, (y - top) / (radius * 2)));
      out.x = x;
      out.y = y - depth * radius * 0.95;
    });
  },
} satisfies MagicEffect;
