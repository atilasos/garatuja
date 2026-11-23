import { rgba, shade } from '../core/tooling/brush-kit';
import { pressureSize } from '../core/tooling/brush-stroke';
import type { BrushDef } from '../core/types';

export default {
  id: 'watercolor', label: { pt: 'Aguarela', en: 'Watercolor' }, order: 140, level: 2, spacing: .07,
  dab(ctx, d) {
    // Soft blobs with a slightly darker rim; the paint builds up where the brush lingers or returns.
    const radius = pressureSize(d.size, d.pressure) / 2;
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const x = d.x + (d.random() - .5) * radius * .4;
      const y = d.y + (d.random() - .5) * radius * .4;
      const reach = radius * (.8 + d.random() * .22);
      const color = shade(d.color, (d.random() - .5) * .07);
      const wash = ctx.createRadialGradient(x, y, reach * .15, x, y, reach);
      wash.addColorStop(0, rgba(color, .04));
      wash.addColorStop(.7, rgba(color, .035));
      wash.addColorStop(.93, rgba(color, .042));
      wash.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = wash;
      ctx.beginPath();
      ctx.arc(x, y, reach, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
} satisfies BrushDef;
