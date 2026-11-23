import { grayInto } from './_util/b-color';
import { dual } from './_util/b-dual';

export default dual({
  id: 'gray',
  label: { pt: 'Cinzento', en: 'Gray' },
  hint: { pt: 'Arrasta para tirar as cores e deixar tudo cinzento.', en: 'Drag to take the colors away and leave everything gray.' },
  category: 'cor', order: 108, level: 1, usesColor: false,
  map(r, g, b, _x, _y, out) { grayInto(out, r, g, b); },
});
