import { dual } from './_util/b-dual';

export default dual({
  id: 'negative',
  label: { pt: 'Negativo', en: 'Negative' },
  hint: { pt: 'Arrasta para trocar as cores pelas cores contrárias.', en: 'Drag to swap the colors for their opposites.' },
  category: 'cor', order: 116, level: 1, usesColor: false,
  map(r, g, b, _x, _y, out) {
    out.r = 255 - r;
    out.g = 255 - g;
    out.b = 255 - b;
  },
});
