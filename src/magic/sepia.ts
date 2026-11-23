import { dual } from './_util/b-dual';

export default dual({
  id: 'sepia',
  label: { pt: 'Sépia', en: 'Sepia' },
  hint: { pt: 'Arrasta para dar um tom antigo, castanho.', en: 'Drag to give an old brown tone.' },
  category: 'cor', order: 112, level: 1, usesColor: false,
  map(r, g, b, _x, _y, out) {
    out.r = r * 0.393 + g * 0.769 + b * 0.189;
    out.g = r * 0.349 + g * 0.686 + b * 0.168;
    out.b = r * 0.272 + g * 0.534 + b * 0.131;
  },
});
