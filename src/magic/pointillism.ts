import type { MagicEffect } from '../core/types';
import { byte } from './_util/b-color';

export default {
  id: 'pointillism',
  label: { pt: 'Pontinhos', en: 'Pointillism' },
  hint: { pt: 'Toca para refazer o desenho com muitos pontinhos de cor.', en: 'Tap to remake the drawing with lots of colored dots.' },
  category: 'pagina', order: 536, level: 2, usesColor: false,
  whole(c) {
    const w = c.width;
    const h = c.height;
    const src = c.ctx.getImageData(0, 0, w, h);
    const image = new ImageData(w, h);
    for (let i = 0; i < image.data.length; i += 4) {
      image.data[i] = 246;
      image.data[i + 1] = 239;
      image.data[i + 2] = 226;
      image.data[i + 3] = 255;
    }
    const cell = Math.max(6, Math.round(Math.min(w, h) / 18));
    const data = src.data;
    for (let y0 = 0; y0 < h; y0 += cell) {
      for (let x0 = 0; x0 < w; x0 += cell) {
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        const x1 = Math.min(w, x0 + cell);
        const y1 = Math.min(h, y0 + cell);
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * w + x) * 4;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            n++;
          }
        }
        const cx = x0 + cell / 2;
        const cy = y0 + cell / 2;
        const dot = cell * 0.42;
        const r2 = dot * dot;
        const cr = r / n;
        const cg = g / n;
        const cb = b / n;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > r2) continue;
            const i = (y * w + x) * 4;
            image.data[i] = byte(cr);
            image.data[i + 1] = byte(cg);
            image.data[i + 2] = byte(cb);
          }
        }
      }
    }
    c.ctx.putImageData(image, 0, 0);
    c.markAllDirty();
  },
} satisfies MagicEffect;
