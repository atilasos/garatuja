import type { MagicEffect } from '../core/types';
import { blockStroke } from './_util/b-blocks';

export default {
  id: 'mosaic',
  label: { pt: 'Mosaico', en: 'Mosaic' },
  hint: { pt: 'Arrasta para fazer pecinhas com uma junta escura entre elas.', en: 'Drag to make little tiles with a dark gap between them.' },
  category: 'distorcer', order: 212, level: 2, usesColor: false,
  stroke(from, to, c, size) { blockStroke(c, from, to, size, Math.max(5, size / 3.4), 'grout'); },
} satisfies MagicEffect;
