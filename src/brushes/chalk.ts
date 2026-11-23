import { pressureSize } from '../core/tooling/brush-stroke';
import type { BrushDef } from '../core/types';

export default {
  id: 'chalk', label: { pt: 'Giz', en: 'Chalk' }, order: 30, level: 1, spacing: .13,
  dab(ctx, d) {
    const radius = pressureSize(d.size, d.pressure) / 2;
    ctx.save();
    ctx.fillStyle = d.color;
    for (let i = 0; i < 26; i++) {
      const size = (d.random() * .22 + .07) * radius;
      const angle = d.random() * Math.PI * 2;
      const offset = d.random() * radius;
      ctx.globalAlpha = .16 + d.random() * .6;
      ctx.fillRect(d.x + Math.cos(angle) * offset - size / 2, d.y + Math.sin(angle) * offset - size / 2, size, size);
    }
    ctx.restore();
  },
} satisfies BrushDef;
