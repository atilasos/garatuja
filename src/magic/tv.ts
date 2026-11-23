import { dual } from './_util/b-dual';

export default dual({
  id: 'tv',
  label: { pt: 'TV', en: 'TV' },
  hint: { pt: 'Toca para pôr riscas, como numa televisão antiga.', en: 'Tap to add stripes, like an old television.' },
  category: 'pagina', order: 528, level: 2, usesColor: false, modes: 'whole',
  map(r, g, b, _x, y, out) {
    if (y % 3 === 2) {
      out.r = r * 0.38;
      out.g = g * 0.42;
      out.b = b * 0.48;
      return;
    }
    out.r = y % 2 === 0 ? r * 1.06 : r * 0.92;
    out.g = g;
    out.b = y % 2 === 0 ? b * 0.86 : b * 1.08;
  },
});
