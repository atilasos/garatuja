import { luma } from './_util/b-color';
import { dual } from './_util/b-dual';

export default dual({
  id: 'metal',
  label: { pt: 'Metal', en: 'Metal' },
  hint: { pt: 'Arrasta para dar um brilho de metal.', en: 'Drag to give a metallic shine.' },
  category: 'cor', order: 168, level: 2, usesColor: false,
  map(r, g, b, x, y, out) {
    const shine = luma(r, g, b) / 255;
    const curve = shine * shine * (3 - 2 * shine);
    const band = Math.abs(((x + y * 0.65) % 16) - 8) / 8;
    const v = 62 + curve * 150 + (1 - band) * 38;
    out.r = v * 0.9;
    out.g = v * 0.95;
    out.b = v;
  },
});
