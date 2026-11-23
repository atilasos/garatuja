import type { MagicEffect } from '../core/types';
import { warpPage } from './_util/b-bitmap';

export default {
  id: 'zoom',
  label: { pt: 'Zoom', en: 'Zoom' },
  hint: { pt: 'Toca para aproximar o meio da folha.', en: 'Tap to bring the middle of the page closer.' },
  category: 'pagina', order: 516, level: 2, usesColor: false,
  whole(c) {
    warpPage(c, (x, y, w, h, out) => {
      out.x = (x - w / 2) / 1.7 + w / 2;
      out.y = (y - h / 2) / 1.7 + h / 2;
    });
  },
} satisfies MagicEffect;
