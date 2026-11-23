import { stepIndex } from '../core/tooling/brush-kit';
import type { BrushDef } from '../core/types';

const spacing = 1.2;

export default {
  id: 'footprints', label: { pt: 'Pegadas', en: 'Footprints' }, order: 310, level: 2, spacing,
  dab(ctx, d) {
    // Left and right feet take turns, one on each side of the path.
    const side = stepIndex(d.travelled, d.size, spacing) % 2 ? 1 : -1;
    const s = d.size * (1.2 + .4 * d.pressure);
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle);
    ctx.translate(0, side * s * .3);
    // The foot is drawn walking along +x with the big toe on the −y side; the other foot is its mirror image.
    ctx.scale(s, side * s);
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.moveTo(-.45, 0);
    ctx.bezierCurveTo(-.45, -.09, -.36, -.12, -.25, -.11);
    ctx.bezierCurveTo(-.12, -.1, -.08, -.14, .05, -.19);
    ctx.bezierCurveTo(.18, -.23, .3, -.14, .3, 0);
    ctx.bezierCurveTo(.3, .16, .2, .21, .06, .2);
    ctx.bezierCurveTo(-.08, .19, -.14, .1, -.25, .1);
    ctx.bezierCurveTo(-.37, .1, -.45, .08, -.45, 0);
    ctx.fill();
    const toes = [[.4, -.15, .085], [.43, -.06, .07], [.43, .03, .064], [.4, .11, .058], [.36, .18, .05]];
    ctx.beginPath();
    for (const [x, y, radius] of toes) {
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  },
} satisfies BrushDef;
