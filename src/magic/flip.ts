import type { MagicEffect } from '../core/types';
import { warpPage } from './_util/b-bitmap';

export default {
  id: 'flip',
  label: { pt: 'Virar', en: 'Flip' },
  hint: { pt: 'Toca para inverter a folha de cima para baixo.', en: 'Tap to flip the whole sheet top to bottom.' },
  category: 'pagina', order: 504, level: 2, usesColor: false,
  whole(c) {
    warpPage(c, (x, y, _w, h, out) => {
      out.x = x;
      out.y = h - 1 - y;
    });
  },
} satisfies MagicEffect;
