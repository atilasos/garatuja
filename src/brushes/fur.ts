import { shade } from '../core/tooling/brush-kit';
import { pressureSize } from '../core/tooling/brush-stroke';
import type { BrushDef } from '../core/types';

export default {
  id: 'fur', label: { pt: 'Pelo', en: 'Fur' }, order: 340, level: 2, spacing: .07,
  hint: { pt: 'Arrasta para fazer um traço coberto de pelos.', en: 'Drag to make a furry line.' },
  dab(ctx, d) {
    // Short hairs on both sides of the path, combed backwards.
    const reach = pressureSize(d.size, d.pressure) / 2;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, d.size * .035);
    for (let i = 0; i < 3; i++) {
      const side = d.random() < .5 ? -1 : 1;
      const length = reach * (.35 + d.random() * .6);
      const lean = d.angle + side * (Math.PI / 2 + .35 + d.random() * .4);
      ctx.strokeStyle = shade(d.color, (d.random() - .5) * .28);
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + Math.cos(lean) * length, d.y + Math.sin(lean) * length);
      ctx.stroke();
    }
    ctx.restore();
  },
} satisfies BrushDef;
