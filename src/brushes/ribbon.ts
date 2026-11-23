import { shade, speedWidth } from '../core/tooling/brush-kit';
import type { BrushDef } from '../core/types';

let width = 0;

export default {
  id: 'ribbon', label: { pt: 'Fita', en: 'Ribbon' }, order: 60, level: 2, spacing: .06,
  hint: { pt: 'Muda a velocidade da mão para alargar ou estreitar a fita.', en: 'Change speed to make the ribbon wider or narrower.' },
  begin() { width = 0; },
  dab(ctx, d) {
    // A flat ribbon: its width across the path shrinks when the hand moves faster.
    const target = speedWidth(d.speed);
    width = width ? width + (target - width) * .2 : target;
    const across = Math.max(2, d.size * width * 1.15);
    const along = Math.max(2.5, d.size * .2);
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle);
    ctx.fillStyle = d.color;
    ctx.fillRect(-along / 2, -across / 2, along, across);
    ctx.fillStyle = shade(d.color, .16);
    ctx.fillRect(-along / 2, -across * .22, along, across * .3);
    ctx.restore();
  },
} satisfies BrushDef;
