import { speedWidth } from '../core/tooling/brush-kit';
import type { BrushDef } from '../core/types';

let width = 0;
let sawPressure = false;

export default {
  id: 'pen', label: { pt: 'Caneta', en: 'Pen' }, order: 50, level: 2, spacing: .06,
  begin() { width = 0; sawPressure = false; },
  dab(ctx, d) {
    // A stylus reports real pressure; a mouse or finger does not, so speed stands in for it.
    if (Math.abs(d.pressure - .5) > .02) sawPressure = true;
    const target = sawPressure ? .12 + 1.1 * d.pressure : speedWidth(d.speed);
    width = width ? width + (target - width) * .22 : target;
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(d.x, d.y, Math.max(.8, d.size * width / 2), 0, Math.PI * 2);
    ctx.fill();
  },
} satisfies BrushDef;
