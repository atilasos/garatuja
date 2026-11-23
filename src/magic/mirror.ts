import type { MagicEffect } from '../core/types';
import { warpPage } from './_util/b-bitmap';

export default {
  id: 'mirror',
  label: { pt: 'Espelho', en: 'Mirror' },
  hint: { pt: 'Toca para copiar o lado esquerdo para o lado direito.', en: 'Tap to copy the left side onto the right side.' },
  category: 'pagina', order: 500, level: 1, usesColor: false,
  whole(c) {
    warpPage(c, (x, y, w, _h, out) => {
      const half = Math.floor(w / 2);
      out.x = x < half ? x : half - 1 - (x - half);
      out.y = y;
    });
  },
} satisfies MagicEffect;
