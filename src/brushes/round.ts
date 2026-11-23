import { pressureSize } from '../core/tooling/brush-stroke';
import type { BrushDef } from '../core/types';

export default {
  id: 'round', label: { pt: 'Redondo', en: 'Round' }, order: 10, level: 1, spacing: .12,
  dab(ctx, d) {
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(d.x, d.y, pressureSize(d.size, d.pressure) / 2, 0, Math.PI * 2);
    ctx.fill();
  },
} satisfies BrushDef;
