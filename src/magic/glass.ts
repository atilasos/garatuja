import type { MagicEffect } from '../core/types';
import { blockStroke } from './_util/b-blocks';

export default {
  id: 'glass',
  label: { pt: 'Vidro', en: 'Glass tile' },
  hint: { pt: 'Arrasta para cobrir com azulejos de vidro brilhantes.', en: 'Drag to cover with shiny glass tiles.' },
  category: 'distorcer', order: 216, level: 2, usesColor: false,
  stroke(from, to, c, size) { blockStroke(c, from, to, size, Math.max(7, size / 2.8), 'bevel'); },
} satisfies MagicEffect;
