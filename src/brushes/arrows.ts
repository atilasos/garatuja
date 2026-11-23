import type { BrushDef } from '../core/types';

export default {
  id: 'arrows', label: { pt: 'Setas', en: 'Arrows' }, order: 300, level: 2, spacing: 1.35,
  dab(ctx, d) {
    const s = d.size * (.6 + .5 * d.pressure);
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle);
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.moveTo(-.5 * s, -.12 * s);
    ctx.lineTo(.08 * s, -.12 * s);
    ctx.lineTo(.08 * s, -.32 * s);
    ctx.lineTo(.5 * s, 0);
    ctx.lineTo(.08 * s, .32 * s);
    ctx.lineTo(.08 * s, .12 * s);
    ctx.lineTo(-.5 * s, .12 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
} satisfies BrushDef;
