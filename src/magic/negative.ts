import type { MagicEffect } from '../core/types';

export default {
  id: 'negative', label: { pt: 'Negativo', en: 'Negative' },
  hint: { pt: 'Toca na folha para trocar todas as cores pelas suas opostas.', en: 'Tap the paper to invert all the colors.' },
  category: 'pagina', level: 2, order: 30, usesColor: false,
  whole(c) {
    const image = c.ctx.getImageData(0, 0, c.width, c.height);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }
    c.ctx.putImageData(image, 0, 0);
    c.markAllDirty();
  },
} satisfies MagicEffect;
