import { blockStroke } from './_util/b-blocks';
import type { MagicEffect } from '../core/types';

export default {
  id: 'pixelate',
  label: { pt: 'Blocos', en: 'Blocks' },
  hint: { pt: 'Arrasta para partir o desenho em quadradinhos grandes.', en: 'Drag to break the drawing into big squares.' },
  category: 'distorcer', order: 208, level: 1, usesColor: false,
  stroke(from, to, c, size) { blockStroke(c, from, to, size, Math.max(6, size / 2.1), 'flat'); },
} satisfies MagicEffect;
