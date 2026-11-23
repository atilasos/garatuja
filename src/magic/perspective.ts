import type { MagicEffect } from '../core/types';
import { warpPage } from './_util/b-bitmap';

export default {
  id: 'perspective',
  label: { pt: 'Perspetiva', en: 'Perspective' },
  hint: { pt: 'Toca para inclinar a folha, como se fosse para longe.', en: 'Tap to tilt the page, as if it goes far away.' },
  category: 'pagina', order: 520, level: 2, usesColor: false,
  whole(c) {
    warpPage(c, (x, y, w, h, out) => {
      const t = h <= 1 ? 0 : y / (h - 1);
      const inset = (1 - t) * 0.36 * (w - 1);
      const span = Math.max(1, w - 1 - inset * 2);
      out.x = inset + (x / Math.max(1, w - 1)) * span;
      out.y = y;
    });
  },
} satisfies MagicEffect;
