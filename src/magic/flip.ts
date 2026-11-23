import type { MagicEffect } from '../core/types';
import { warpPage } from './_util/b-bitmap';

export default {
  id: 'flip',
  label: { pt: 'Virar', en: 'Flip' },
  hint: { pt: 'Toca para copiar a parte de cima para a parte de baixo.', en: 'Tap to copy the top onto the bottom.' },
  category: 'pagina', order: 504, level: 2, usesColor: false,
  whole(c) {
    warpPage(c, (x, y, _w, h, out) => {
      const half = Math.floor(h / 2);
      out.x = x;
      out.y = y < half ? y : half - 1 - (y - half);
    });
  },
} satisfies MagicEffect;
