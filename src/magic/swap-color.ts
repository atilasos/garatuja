import { hexToRgb, type Rgb } from '../core/draw';
import { readPoint } from './_util/b-bitmap';
import { nearColor } from './_util/b-color';
import { dual } from './_util/b-dual';

const key: Rgb = { r: 255, g: 255, b: 255 };

export default dual({
  id: 'swap-color',
  label: { pt: 'Trocar cor', en: 'Swap color' },
  hint: { pt: 'Toca numa cor para a trocar pela cor escolhida, na folha toda.', en: 'Tap a color to replace it with your chosen color, on the whole page.' },
  category: 'cor', order: 136, level: 2, usesColor: true, modes: 'whole',
  begin(p, c) { readPoint(c.ctx, p.x, p.y, key); },
  map(r, g, b, _x, _y, out, c) {
    if (!nearColor(r, g, b, key)) {
      out.r = r;
      out.g = g;
      out.b = b;
      return;
    }
    const ink = hexToRgb(c.color);
    out.r = ink.r;
    out.g = ink.g;
    out.b = ink.b;
  },
});
