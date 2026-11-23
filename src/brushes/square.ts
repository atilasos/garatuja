import { pressureSize } from '../core/tooling/brush-stroke';
import type { BrushDef } from '../core/types';

export default {
  id: 'square', label: { pt: 'Quadrado', en: 'Square' }, order: 20, level: 1, spacing: .14,
  dab(ctx, d) {
    const size = pressureSize(d.size, d.pressure);
    ctx.fillStyle = d.color;
    ctx.fillRect(d.x - size / 2, d.y - size / 2, size, size);
  },
} satisfies BrushDef;
