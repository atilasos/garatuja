import { dual } from './_util/b-dual';

export default dual({
  id: 'warm',
  label: { pt: 'Aquecer', en: 'Warm' },
  hint: { pt: 'Arrasta para puxar as cores para o laranja.', en: 'Drag to pull the colors toward orange.' },
  category: 'cor', order: 144, level: 2, usesColor: false,
  map(r, g, b, _x, _y, out) {
    out.r = r + (255 - r) * 0.34;
    out.g = g * 0.94 + 18;
    out.b = b * 0.62;
  },
});
