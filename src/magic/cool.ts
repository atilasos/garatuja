import { dual } from './_util/b-dual';

export default dual({
  id: 'cool',
  label: { pt: 'Arrefecer', en: 'Cool' },
  hint: { pt: 'Arrasta para puxar as cores para o azul.', en: 'Drag to pull the colors toward blue.' },
  category: 'cor', order: 140, level: 2, usesColor: false,
  map(r, g, b, _x, _y, out) {
    out.r = r * 0.78;
    out.g = g * 0.92;
    out.b = b + (255 - b) * 0.38;
  },
});
