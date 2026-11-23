import type { MagicEffect } from '../core/types';
import { blurStroke } from './_util/b-bitmap';

export default {
  id: 'bleed',
  label: { pt: 'Aguada', en: 'Bleed' },
  hint: { pt: 'Arrasta para a tinta se espalhar, como água.', en: 'Drag to let the paint spread, like water.' },
  category: 'distorcer', order: 252, level: 2, usesColor: false,
  stroke(from, to, c, size) {
    blurStroke(c, from, to, size, Math.max(2, size / 4.5), 1.9);
  },
} satisfies MagicEffect;
