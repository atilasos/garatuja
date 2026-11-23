import { pressureSize } from '../core/tooling/brush-stroke';
import type { BrushDef } from '../core/types';

export default {
  id: 'spray', label: { pt: 'Spray', en: 'Spray' }, order: 40, level: 2, spacing: .11,
  dab(ctx, d) {
    const radius = pressureSize(d.size, d.pressure) * .7;
    ctx.save();
    ctx.globalAlpha = .72;
    ctx.fillStyle = d.color;
    ctx.beginPath();
    for (let i = 0; i < 35; i++) {
      const angle = d.random() * Math.PI * 2;
      const distance = d.random() ** .7 * radius;
      const x = d.x + Math.cos(angle) * distance;
      const y = d.y + Math.sin(angle) * distance;
      const grain = .55 + d.random() * radius * .08;
      ctx.moveTo(x + grain, y);
      ctx.arc(x, y, grain, 0, 2 * Math.PI);
    }
    ctx.fill();
    ctx.restore();
  },
} satisfies BrushDef;
