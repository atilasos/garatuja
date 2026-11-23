import { saturateInto } from './_util/b-color';
import { dual } from './_util/b-dual';

export default dual({
  id: 'saturate',
  label: { pt: 'Saturar', en: 'Saturate' },
  hint: { pt: 'Arrasta para tornar as cores mais vivas.', en: 'Drag to make the colors brighter.' },
  category: 'cor', order: 124, level: 2, usesColor: false,
  map(r, g, b, _x, _y, out) { saturateInto(out, r, g, b, 2.15); },
});
