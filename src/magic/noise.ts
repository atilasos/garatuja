import type { MagicEffect } from '../core/types';
import { filterStroke } from './_util/b-bitmap';

export default {
  id: 'noise',
  label: { pt: 'Ruído', en: 'Noise' },
  hint: { pt: 'Arrasta para encher de grãozinhos, como areia.', en: 'Drag to fill with little grains, like sand.' },
  category: 'distorcer', order: 248, level: 2, usesColor: false,
  stroke(from, to, c, size) {
    filterStroke(c, from, to, size, (r, g, b, _x, _y, out) => {
      const grain = (c.random() - 0.5) * 110;
      out.r = r + grain;
      out.g = g + grain;
      out.b = b + grain;
    });
  },
} satisfies MagicEffect;
