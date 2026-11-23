import { grain, grainDab, rgba } from '../core/tooling/brush-kit';
import { pressureSize } from '../core/tooling/brush-stroke';
import type { BrushDef } from '../core/types';

const soot = { key: 'charcoal', seed: 23, cells: [3, 6, 12], threshold: .46, softness: .22 };

export default {
  id: 'charcoal', label: { pt: 'Carvão', en: 'Charcoal' }, order: 120, level: 2, spacing: .07,
  dab(ctx, d) {
    const radius = pressureSize(d.size, d.pressure) / 2;
    grainDab(ctx, d.x, d.y, radius, grain(soot), .3, (s, x, y) => {
      const smudge = s.createRadialGradient(x, y, 0, x, y, radius);
      smudge.addColorStop(0, rgba(d.color, 1));
      smudge.addColorStop(.6, rgba(d.color, .75));
      smudge.addColorStop(1, rgba(d.color, 0));
      s.fillStyle = smudge;
      s.beginPath();
      s.arc(x, y, radius, 0, Math.PI * 2);
      s.fill();
    });
  },
} satisfies BrushDef;
