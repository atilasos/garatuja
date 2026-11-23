import type { MagicEffect, ToolContext } from '../core/types';
import { warpPage } from './_util/b-bitmap';

function tiles(c: ToolContext) {
  try {
    const size = c.opt<number>('size');
    if (typeof size === 'number' && size >= 56) return 3;
  } catch {
    // Whole-page previews may not offer a size. Two tiles stay readable.
  }
  return 2;
}

export default {
  id: 'repeat',
  label: { pt: 'Repetir', en: 'Repeat' },
  hint: { pt: 'Toca para fazer o desenho mais pequeno e repeti-lo. Tamanho grande repete três vezes.', en: 'Tap to shrink the drawing and repeat it. A large size repeats it three times.' },
  category: 'pagina', order: 544, level: 2, usesColor: false,
  whole(c) {
    const n = tiles(c);
    warpPage(c, (x, y, w, h, out) => {
      const cw = w / n;
      const ch = h / n;
      out.x = ((x % cw) / cw) * (w - 1);
      out.y = ((y % ch) / ch) * (h - 1);
    });
  },
} satisfies MagicEffect;
