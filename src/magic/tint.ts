import { hexToRgb } from '../core/draw';
import { mix } from './_util/b-color';
import { dual } from './_util/b-dual';

export default dual({
  id: 'tint',
  label: { pt: 'Tingir', en: 'Tint' },
  hint: { pt: 'Arrasta para misturar a cor que escolheste.', en: 'Drag to mix in the color you picked.' },
  category: 'cor', order: 120, level: 1, usesColor: true,
  map(r, g, b, _x, _y, out, c) {
    const ink = hexToRgb(c.color);
    out.r = mix(r, ink.r, 0.62);
    out.g = mix(g, ink.g, 0.62);
    out.b = mix(b, ink.b, 0.62);
  },
});
