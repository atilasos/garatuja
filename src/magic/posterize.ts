import { dual } from './_util/b-dual';

const step = 255 / 3;

function band(value: number) {
  return Math.round(value / step) * step;
}

export default dual({
  id: 'posterize',
  label: { pt: 'Banda desenhada', en: 'Comic' },
  hint: { pt: 'Arrasta para juntar as cores em manchas, como numa banda desenhada.', en: 'Drag to gather the colors into patches, like a comic.' },
  category: 'cor', order: 152, level: 1, usesColor: false,
  map(r, g, b, _x, _y, out) {
    out.r = band(r);
    out.g = band(g);
    out.b = band(b);
  },
});
