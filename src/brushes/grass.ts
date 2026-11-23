import { shade } from '../core/tooling/brush-kit';
import { pressureSize } from '../core/tooling/brush-stroke';
import type { BrushDef } from '../core/types';

export default {
  id: 'grass', label: { pt: 'Relva', en: 'Grass' }, order: 330, level: 2, spacing: .12,
  dab(ctx, d) {
    // Blades grow to one side of the path, perpendicular to where the hand is going.
    const reach = pressureSize(d.size, d.pressure);
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const length = reach * (.45 + d.random() * .65);
      const lean = d.angle - Math.PI / 2 + (d.random() - .5) * .8;
      const along = (d.random() - .5) * reach * .25;
      const x = d.x + Math.cos(d.angle) * along;
      const y = d.y + Math.sin(d.angle) * along;
      ctx.strokeStyle = shade(d.color, (d.random() - .5) * .3);
      ctx.lineWidth = Math.max(1.3, d.size * .05);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(lean) * length * .5 + Math.cos(d.angle) * length * .12,
        y + Math.sin(lean) * length * .5 + Math.sin(d.angle) * length * .12, x + Math.cos(lean + .25) * length, y + Math.sin(lean + .25) * length);
      ctx.stroke();
    }
    ctx.restore();
  },
} satisfies BrushDef;
