import type { MagicEffect } from '../core/types';
import { warpStroke } from './_util/b-bitmap';

export default {
  id: 'magnify',
  label: { pt: 'Lupa', en: 'Magnify' },
  hint: { pt: 'Arrasta para aumentar o que está por baixo do dedo.', en: 'Drag to enlarge what is under your finger.' },
  category: 'distorcer', order: 228, level: 2, usesColor: false,
  stroke(from, to, c, size) {
    const cx = to.x;
    const cy = to.y;
    warpStroke(c, from, to, size, (x, y, out) => {
      out.x = cx + (x - cx) / 2.15;
      out.y = cy + (y - cy) / 2.15;
    });
  },
} satisfies MagicEffect;
