import type { MagicEffect } from '../core/types';
import { byte, luma } from './_util/b-color';

export default {
  id: 'halftone',
  label: { pt: 'Bolinhas', en: 'Halftone' },
  hint: { pt: 'Toca para refazer o desenho com bolinhas pretas, como um jornal.', en: 'Tap to remake the drawing with black dots, like a newspaper.' },
  category: 'pagina', order: 532, level: 2, usesColor: false,
  whole(c) {
    const w = c.width;
    const h = c.height;
    const src = c.ctx.getImageData(0, 0, w, h);
    const image = new ImageData(w, h);
    image.data.fill(255);
    const cell = Math.max(6, Math.round(Math.min(w, h) / 16));
    const data = src.data;
    for (let y0 = 0; y0 < h; y0 += cell) {
      for (let x0 = 0; x0 < w; x0 += cell) {
        let sum = 0;
        let n = 0;
        const x1 = Math.min(w, x0 + cell);
        const y1 = Math.min(h, y0 + cell);
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * w + x) * 4;
            sum += luma(data[i], data[i + 1], data[i + 2]);
            n++;
          }
        }
        const darkness = 1 - sum / n / 255;
        const dot = cell * 0.52 * Math.pow(darkness, 0.62);
        const cx = x0 + cell / 2;
        const cy = y0 + cell / 2;
        const r2 = dot * dot;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > r2) continue;
            const i = (y * w + x) * 4;
            image.data[i] = 22;
            image.data[i + 1] = 20;
            image.data[i + 2] = 18;
          }
        }
      }
    }
    for (let i = 3; i < image.data.length; i += 4) image.data[i] = 255;
    for (let i = 0; i < image.data.length; i += 4) {
      image.data[i] = byte(image.data[i]);
      image.data[i + 1] = byte(image.data[i + 1]);
      image.data[i + 2] = byte(image.data[i + 2]);
    }
    c.ctx.putImageData(image, 0, 0);
    c.markAllDirty();
  },
} satisfies MagicEffect;
