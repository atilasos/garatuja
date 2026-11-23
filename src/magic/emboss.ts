import type { MagicEffect } from '../core/types';
import { channelAt, shadePage, shadeStroke, type ShadeFn } from './_util/b-bitmap';

const shade: ShadeFn = (src, w, h, x, y, out) => {
  const diff = channelAt(src, w, h, x - 1, y - 1) - channelAt(src, w, h, x + 1, y + 1);
  const v = 128 + diff * 0.95;
  out.r = v;
  out.g = v;
  out.b = v + 10;
};

export default {
  id: 'emboss',
  label: { pt: 'Relevo', en: 'Emboss' },
  hint: { pt: 'Arrasta para o desenho parecer saltar do papel.', en: 'Drag to make the drawing look raised from the paper.' },
  category: 'cor', order: 160, level: 2, usesColor: false,
  stroke: (from, to, c, size) => shadeStroke(c, from, to, size, shade),
  whole: c => shadePage(c, shade),
} satisfies MagicEffect;
