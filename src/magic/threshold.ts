import { luma } from './_util/b-color';
import { dual } from './_util/b-dual';

export default dual({
  id: 'threshold',
  label: { pt: 'Preto e branco', en: 'Black and white' },
  hint: { pt: 'Arrasta para deixar só preto e branco, sem cinzentos.', en: 'Drag to leave only black and white, with no grays.' },
  category: 'cor', order: 148, level: 2, usesColor: false,
  map(r, g, b, _x, _y, out) {
    const v = luma(r, g, b) > 148 ? 255 : 16;
    out.r = v;
    out.g = v;
    out.b = v;
  },
});
