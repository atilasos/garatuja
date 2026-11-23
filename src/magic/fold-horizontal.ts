import type { MagicEffect } from '../core/types';
import { warpPage } from './_util/b-bitmap';

export default {
  id: 'fold-horizontal',
  label: { pt: 'Dobrar ao meio', en: 'Fold in half' },
  hint: { pt: 'Toca para copiar o lado esquerdo para o lado direito.', en: 'Tap to copy the left side onto the right side.' },
  category: 'pagina', order: 501, level: 2, usesColor: false,
  whole(c) {
    warpPage(c, (x, y, w, _h, out) => {
      const half = Math.floor(w / 2);
      out.x = x < half ? x : half - 1 - (x - half);
      out.y = y;
    });
  },
} satisfies MagicEffect;
