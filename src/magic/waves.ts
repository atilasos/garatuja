import type { MagicEffect } from '../core/types';
import { warpPage } from './_util/b-bitmap';

export default {
  id: 'waves',
  label: { pt: 'Ondas', en: 'Waves' },
  hint: { pt: 'Toca para ondular a folha toda, como uma bandeira.', en: 'Tap to ripple the whole page, like a flag.' },
  category: 'pagina', order: 540, level: 2, usesColor: false,
  whole(c) {
    warpPage(c, (x, y, w, h, out) => {
      out.x = x + Math.sin(y * 0.05) * w * 0.028;
      out.y = y + Math.sin(x * 0.04) * h * 0.02;
    }, true);
  },
} satisfies MagicEffect;
