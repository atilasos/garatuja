import { dual } from './_util/b-dual';

const amount = 0.45;

export default dual({
  id: 'lighten',
  label: { pt: 'Clarear', en: 'Lighten' },
  hint: { pt: 'Arrasta para tornar as cores mais claras.', en: 'Drag to make the colors lighter.' },
  category: 'cor', order: 100, level: 1, usesColor: false,
  map(r, g, b, _x, _y, out) {
    out.r = r + (255 - r) * amount;
    out.g = g + (255 - g) * amount;
    out.b = b + (255 - b) * amount;
  },
});
