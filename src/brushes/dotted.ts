import { pressureSize } from '../core/tooling/brush-stroke';
import type { BrushDef } from '../core/types';

export default {
  id: 'dotted', label: { pt: 'Pontilhado', en: 'Dotted' }, order: 70, level: 1, spacing: 1,
  hint: { pt: 'Arrasta para deixar um caminho de pontos.', en: 'Drag to leave a trail of dots.' },
  dab(ctx, d) {
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(d.x, d.y, pressureSize(d.size, d.pressure) * .27, 0, Math.PI * 2);
    ctx.fill();
  },
} satisfies BrushDef;
