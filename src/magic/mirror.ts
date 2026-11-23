import type { MagicEffect } from '../core/types';
import { warpPage } from './_util/b-bitmap';

export default {
  id: 'mirror',
  label: { pt: 'Espelho', en: 'Mirror' },
  hint: { pt: 'Toca para inverter a folha da esquerda para a direita.', en: 'Tap to flip the whole sheet left to right.' },
  category: 'pagina', order: 500, level: 1, usesColor: false,
  whole(c) {
    warpPage(c, (x, y, w, _h, out) => {
      out.x = w - 1 - x;
      out.y = y;
    });
  },
} satisfies MagicEffect;
