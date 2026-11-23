import type { MagicEffect } from '../core/types';
import { warpStroke } from './_util/b-bitmap';

export default {
  id: 'whirl',
  label: { pt: 'Redemoinho', en: 'Whirl' },
  hint: { pt: 'Arrasta para rodar o desenho à volta do dedo.', en: 'Drag to spin the drawing around your finger.' },
  category: 'distorcer', order: 224, level: 2, usesColor: false,
  stroke(from, to, c, size) {
    const cx = (from.x + to.x) / 2;
    const cy = (from.y + to.y) / 2;
    const radius = Math.max(1, size / 2);
    warpStroke(c, from, to, size, (x, y, out) => {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const angle = (1 - Math.min(1, dist / radius)) * 1.25;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      out.x = cx + dx * cos - dy * sin;
      out.y = cy + dx * sin + dy * cos;
    });
  },
} satisfies MagicEffect;
