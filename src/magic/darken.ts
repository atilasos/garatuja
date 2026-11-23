import { dual } from './_util/b-dual';

const amount = 0.42;

export default dual({
  id: 'darken',
  label: { pt: 'Escurecer', en: 'Darken' },
  hint: { pt: 'Arrasta para tornar as cores mais escuras.', en: 'Drag to make the colors darker.' },
  category: 'cor', order: 104, level: 1, usesColor: false,
  map(r, g, b, _x, _y, out) {
    out.r = r * (1 - amount);
    out.g = g * (1 - amount);
    out.b = b * (1 - amount);
  },
});
