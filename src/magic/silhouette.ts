import { luma } from './_util/b-color';
import { dual } from './_util/b-dual';

export default dual({
  id: 'silhouette',
  label: { pt: 'Silhueta', en: 'Silhouette' },
  hint: { pt: 'Arrasta para transformar o desenho numa sombra.', en: 'Drag to turn the drawing into a shadow.' },
  category: 'cor', order: 164, level: 2, usesColor: false,
  map(r, g, b, _x, _y, out) {
    if (luma(r, g, b) > 176) {
      out.r = 232;
      out.g = 244;
      out.b = 250;
      return;
    }
    out.r = 24;
    out.g = 22;
    out.b = 28;
  },
});
