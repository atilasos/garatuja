import type { BrushDef } from '../core/types';

export default {
  id: 'dashed', label: { pt: 'Tracejado', en: 'Dashed' }, order: 80, level: 2, spacing: .08,
  dab(ctx, d) {
    const cycle = d.size * 2.6;
    if (d.travelled % cycle > d.size * 1.5) return;
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(d.x, d.y, Math.max(1.2, d.size * (.14 + .16 * d.pressure)), 0, Math.PI * 2);
    ctx.fill();
  },
} satisfies BrushDef;
