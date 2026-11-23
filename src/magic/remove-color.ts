import type { Rgb } from '../core/draw';
import { paintingContext, readPoint } from './_util/b-bitmap';
import { nearColor } from './_util/b-color';
import { dual } from './_util/b-dual';

const key: Rgb = { r: 255, g: 255, b: 255 };
let paper: Uint8ClampedArray | null = null;
let paperWidth = 0;

export default dual({
  id: 'remove-color',
  label: { pt: 'Tirar cor', en: 'Remove color' },
  hint: { pt: 'Toca numa cor para a transformar na cor do papel.', en: 'Tap a color to turn it into the paper color.' },
  category: 'cor', order: 128, level: 2, usesColor: false,
  begin(p, c) {
    readPoint(c.ctx, p.x, p.y, key);
    const image = paintingContext(c.paper).getImageData(0, 0, c.width, c.height);
    paper = image.data;
    paperWidth = image.width;
  },
  map(r, g, b, x, y, out) {
    if (!paper || !nearColor(r, g, b, key)) {
      out.r = r;
      out.g = g;
      out.b = b;
      return;
    }
    const i = (y * paperWidth + x) * 4;
    out.r = paper[i];
    out.g = paper[i + 1];
    out.b = paper[i + 2];
  },
});
