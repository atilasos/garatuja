import { interpolateDabs, strokeBounds } from '../core/draw';
import type { MagicEffect, Point } from '../core/types';

export default {
  id: 'blur', label: { pt: 'Desfocar', en: 'Blur' },
  hint: { pt: 'Passa por cima de um traço para suavizar os contornos.', en: 'Brush over a line to soften its edges.' },
  category: 'distorcer', level: 1, order: 20, usesColor: false,
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const radius = size / 2;
    const blur = Math.max(1, size / 9);
    ctx.save();
    ctx.beginPath();
    const dab = (p: Point) => {
      ctx.moveTo(p.x + radius, p.y);
      ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
    };
    dab(from);
    interpolateDabs(from, to, Math.max(1, size / 4), size / 4, dab);
    dab(to);
    ctx.clip();
    const margin = radius + blur * 4;
    const area = strokeBounds(from, to, margin);
    const x = Math.max(0, Math.floor(area.x));
    const y = Math.max(0, Math.floor(area.y));
    const w = Math.min(c.width, Math.ceil(area.x + area.w)) - x;
    const h = Math.min(c.height, Math.ceil(area.y + area.h)) - y;
    if (w > 0 && h > 0) {
      ctx.filter = `blur(${blur}px)`;
      ctx.drawImage(c.snapshot, x, y, w, h, x, y, w, h);
    }
    ctx.restore();
    c.markDirty(strokeBounds(from, to, radius + 2));
  },
} satisfies MagicEffect;
