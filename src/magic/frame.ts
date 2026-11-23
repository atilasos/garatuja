import type { MagicEffect } from '../core/types';
import { boxBlur } from './_util/b-bitmap';
import { byte, mix } from './_util/b-color';

export default {
  id: 'frame',
  label: { pt: 'Moldura', en: 'Soft frame' },
  hint: { pt: 'Toca para deixar o meio nítido e desfocar a borda.', en: 'Tap to keep the middle sharp and blur the border.' },
  category: 'pagina', order: 548, level: 2, usesColor: false,
  whole(c) {
    const w = c.width;
    const h = c.height;
    const src = c.ctx.getImageData(0, 0, w, h);
    const blurred = boxBlur(src.data, w, h, Math.max(2, Math.round(Math.min(w, h) / 42)));
    const image = new ImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = w <= 1 ? 0 : (x / (w - 1)) * 2 - 1;
        const ny = h <= 1 ? 0 : (y / (h - 1)) * 2 - 1;
        const edge = Math.hypot(nx / 0.7, ny / 0.7);
        const t = edge <= 0.55 ? 0 : edge >= 1.05 ? 1 : (edge - 0.55) / 0.5;
        const blend = t * t * (3 - 2 * t);
        const i = (y * w + x) * 4;
        image.data[i] = byte(mix(src.data[i], blurred[i], blend));
        image.data[i + 1] = byte(mix(src.data[i + 1], blurred[i + 1], blend));
        image.data[i + 2] = byte(mix(src.data[i + 2], blurred[i + 2], blend));
        image.data[i + 3] = 255;
      }
    }
    c.ctx.putImageData(image, 0, 0);
    c.markAllDirty();
  },
} satisfies MagicEffect;
