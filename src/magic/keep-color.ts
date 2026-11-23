import type { Rgb } from '../core/draw';
import { readPoint } from './_util/b-bitmap';
import { grayInto, nearColor } from './_util/b-color';
import { dual } from './_util/b-dual';

const key: Rgb = { r: 255, g: 255, b: 255 };

export default dual({
  id: 'keep-color',
  label: { pt: 'Só esta cor', en: 'Keep color' },
  hint: { pt: 'Toca numa cor para a manter. O resto fica cinzento.', en: 'Tap a color to keep it. The rest turns gray.' },
  category: 'cor', order: 132, level: 2, usesColor: false,
  begin(p, c) { readPoint(c.ctx, p.x, p.y, key); },
  map(r, g, b, _x, _y, out) {
    if (nearColor(r, g, b, key)) {
      out.r = r;
      out.g = g;
      out.b = b;
      return;
    }
    grayInto(out, r, g, b);
  },
});
