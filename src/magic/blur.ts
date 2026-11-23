import { blurStroke } from './_util/b-bitmap';
import type { MagicEffect } from '../core/types';

export default {
  id: 'blur',
  label: { pt: 'Desfocar', en: 'Blur' },
  hint: { pt: 'Passa por cima de um traço para suavizar os contornos.', en: 'Brush over a line to soften its edges.' },
  category: 'distorcer', order: 200, level: 1, usesColor: false,
  stroke(from, to, c, size) {
    blurStroke(c, from, to, size, Math.max(1, size / 11));
  },
} satisfies MagicEffect;
