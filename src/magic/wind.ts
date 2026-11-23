import type { MagicEffect } from '../core/types';
import { warpStroke } from './_util/b-bitmap';

export default {
  id: 'wind',
  label: { pt: 'Vento', en: 'Wind' },
  hint: { pt: 'Arrasta para o vento levar a tinta para o lado.', en: 'Drag to let the wind pull the paint sideways.' },
  category: 'distorcer', order: 244, level: 2, usesColor: false,
  stroke(from, to, c, size) {
    const dir = to.x === from.x ? 1 : Math.sign(to.x - from.x);
    const radius = Math.max(1, size / 2);
    warpStroke(c, from, to, size, (x, y, out) => {
      const streak = ((Math.floor(y) * 13) % 5) / 4;
      out.x = x - dir * streak * radius * 0.9;
      out.y = y;
    });
  },
} satisfies MagicEffect;
