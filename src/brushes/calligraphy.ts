import { pressureSize } from '../core/tooling/brush-stroke';
import type { BrushDef } from '../core/types';

export default {
  id: 'calligraphy', label: { pt: 'Caligrafia', en: 'Calligraphy' }, order: 40, level: 2, spacing: .05,
  dab(ctx, d) {
    // A flat nib held at a fixed angle: thick across the nib, hairline along it.
    const length = pressureSize(d.size, d.pressure);
    const thickness = Math.max(2, d.size * .17);
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(-.75);
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.roundRect(-length / 2, -thickness / 2, length, thickness, thickness * .3);
    ctx.fill();
    ctx.restore();
  },
} satisfies BrushDef;
