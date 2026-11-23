import { stepIndex } from '../core/tooling/brush-kit';
import type { BrushDef } from '../core/types';

const spacing = 1.3;

export default {
  id: 'footprints', label: { pt: 'Pegadas', en: 'Footprints' }, order: 310, level: 2, spacing,
  dab(ctx, d) {
    // Left and right feet take turns, one on each side of the path.
    const side = stepIndex(d.travelled, d.size, spacing) % 2 ? 1 : -1;
    const s = d.size * (1 + .35 * d.pressure);
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle);
    ctx.translate(0, side * s * .3);
    ctx.fillStyle = d.color;
    ctx.beginPath();
    // Heel, arch and the ball of the foot.
    ctx.ellipse(-.3 * s, 0, .16 * s, .12 * s, 0, 0, Math.PI * 2);
    ctx.moveTo(-.04 * s, 0);
    ctx.ellipse(-.12 * s, -side * .02 * s, .17 * s, .08 * s, 0, 0, Math.PI * 2);
    ctx.moveTo(.2 * s, 0);
    ctx.ellipse(.03 * s, 0, .17 * s, .19 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Five toes, the big one on the inner side, set apart from the ball.
    ctx.beginPath();
    for (let toe = 0; toe < 5; toe++) {
      const radius = (.088 - toe * .009) * s;
      const x = .37 * s - Math.abs(toe - .5) * .03 * s;
      const y = -side * (.16 - toe * .08) * s;
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  },
} satisfies BrushDef;
