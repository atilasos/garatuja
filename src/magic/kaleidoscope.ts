import type { MagicEffect } from '../core/types';
import { warpPage } from './_util/b-bitmap';

export default {
  id: 'kaleidoscope',
  label: { pt: 'Caleidoscópio', en: 'Kaleidoscope' },
  hint: { pt: 'Toca para repetir o desenho em espelhos.', en: 'Tap to repeat the drawing in mirrors.' },
  category: 'pagina', order: 508, level: 1, usesColor: false,
  whole(c) {
    warpPage(c, (x, y, w, h, out) => {
      let dx = Math.abs(x - w / 2);
      let dy = Math.abs(y - h / 2);
      if (dx < dy) {
        const swap = dx;
        dx = dy;
        dy = swap;
      }
      out.x = w / 2 - dx;
      out.y = h / 2 - dy;
    });
  },
} satisfies MagicEffect;
