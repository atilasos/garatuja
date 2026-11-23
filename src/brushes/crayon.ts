import { grain, grainDab, rgba } from '../core/tooling/brush-kit';
import { pressureSize } from '../core/tooling/brush-stroke';
import type { BrushDef } from '../core/types';

const wax = { key: 'crayon', seed: 11, cells: [2, 4, 8], threshold: .38, softness: .09 };

export default {
  id: 'crayon', label: { pt: 'Lápis de cera', en: 'Wax crayon' }, order: 100, level: 1, spacing: .1,
  dab(ctx, d) {
    const radius = pressureSize(d.size, d.pressure) / 2;
    grainDab(ctx, d.x, d.y, radius, grain(wax), .8, (s, x, y) => {
      const fade = s.createRadialGradient(x, y, radius * .55, x, y, radius);
      fade.addColorStop(0, d.color);
      fade.addColorStop(1, rgba(d.color, 0));
      s.fillStyle = fade;
      s.beginPath();
      s.arc(x, y, radius, 0, Math.PI * 2);
      s.fill();
    });
  },
} satisfies BrushDef;
