import { channelAt, shadePage, shadeStroke, type ShadeFn } from './_util/b-bitmap';
import type { MagicEffect } from '../core/types';

const shade: ShadeFn = (src, w, h, x, y, out) => {
  const at = (px: number, py: number) => channelAt(src, w, h, px, py);
  const gx = -at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1) + at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1);
  const gy = -at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1) + at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1);
  if (Math.hypot(gx, gy) > 48) {
    out.r = 32;
    out.g = 26;
    out.b = 22;
    return;
  }
  out.r = 246;
  out.g = 240;
  out.b = 228;
};

export default {
  id: 'edges',
  label: { pt: 'Contornos', en: 'Outlines' },
  hint: { pt: 'Arrasta para desenhar o contorno das formas.', en: 'Drag to draw the outline of the shapes.' },
  category: 'cor', order: 156, level: 2, usesColor: false,
  stroke: (from, to, c, size) => shadeStroke(c, from, to, size, shade),
  whole: c => shadePage(c, shade),
} satisfies MagicEffect;
